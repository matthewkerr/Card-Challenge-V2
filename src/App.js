import React, { Component } from 'react';
import StartGame from './components/StartGame/StartGame';
import GameOver from './components/GameOver/GameOver';
import Card from './components/Card/Card';
import Scoreboard from './components/Scoreboard/Scoreboard'
import './App.css';

class App extends Component {

  state = {
    deckOfCards: [],
    lastClickedValue: null,
    lastClickedIndex: null,
    gameStarted: false,
    maxMatches: 26,
    numPlayerMatches: 0,
    numPlayerAttempts: 0,
    numOfCardsInDeck: 0,
    deckId: 0,
    loaded: false,
    blockclick: false
  }

  selectAndSuffleCards = () => {
    //could have used axios but we will just use plain Fetch
    //TIP ::: replace <<deck_id>> with "new" to create a shuffled deck and draw cards from that deck in the same request.
    //This cuts down one request to the API.
    fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1')
    .then(res => res.json())
    .then(json => this.selectDeckOfCards( json ));
  }

  //so far all we took from the API call is the deck ID and remaining cards
  selectDeckOfCards = ( json ) => {
    const deckId = json.deck_id;
    const cardsRemaining = json.remaining;
    //lets go ahead and set the deck Id in state
    this.setState( { deckId: deckId })
    //here we start making calls to the API to bring back one card at a time async.
    this.buildDeckofCardsUsingAPI( cardsRemaining )
  }

  //this get called multiple times
  buildDeckofCardsUsingAPI = ( cardsRemaining ) => {
    if ( cardsRemaining !== 0 ) {
      const apiUrl = 'https://deckofcardsapi.com/api/deck/' + this.state.deckId + '/draw/?count=1';
      fetch(apiUrl)
      .then(res => res.json())
      .then(json => this.processDrawnCard( json ));
    }
  }

  //here we will process our drawn card 
  processDrawnCard = ( json ) => {
    const newCard = json.cards[0];
    const cardsRemaining = json.remaining;
    const array = [...this.state.deckOfCards];
    //Once the game is running I want to control the game from this one shuffled array
    //lets add some properties to our card object before we put it into the array
    newCard.facedown = true; 
    newCard.matched = false;
    //let put our new card on the array
    array.push( newCard ) ;
    this.setState({ deckOfCards: array })
    //we draw cards when the player starts the game
    if ( cardsRemaining !== 0 ) {
      this.buildDeckofCardsUsingAPI( cardsRemaining )
    }
    else
    {
      //we can now click the cards on the stage 
      this.setState({ loaded: true })
    }
  }

  onCardClicked = ( event ) => {
    //if we click the same card then we dont to anything .. if we are not loaded we dont want to do anything.. or if the timer is running
    if ( event === this.state.lastClickedIndex || !this.state.loaded || this.state.blockclick ) { return }
    //lets get our current index , make a copy of the state array, and deep copt the current card,
    //TODO:: deep copy the last card and pass the cards to update the copied data.
    let index = event;
    let lastIndexClicked = this.state.lastClickedIndex;
    let array = [ ...this.state.deckOfCards ];
    let card = { ...array[index] };

    if ( this.state.lastClickedValue === card.value  ) {
      //Here we have a match , let show the second card and call the timeout for Match Complete.
      card.facedown = false;
      array[index] = card;
      this.setState({ deckOfCards: array, blockclick: true })
      setTimeout( this.matchDetected, 500, index, lastIndexClicked, array )
    }
    else if ( (this.state.lastClickedValue !== null ) && ( this.state.lastClickedValue !== card.value ) ) {
      //we have chosen two cards with no match
      card.facedown = false;
      array[index] = card;
      this.setState({ deckOfCards: array , blockclick: true })
      setTimeout( this.noMatchDetected, 500, index, lastIndexClicked, array )
    }
    else {
      //we have chosen one card with no match yet
      card.facedown = false;
      array[index] = card;
      this.setState({ lastClickedValue: card.value, lastClickedIndex: event, deckOfCards: array, blockclick: false })
    }
  }

  matchDetected = ( index, lastIndex, array ) => {
    //get the cards from the array by deep copy.
    let newCard = { ...array[index] };
    let lastCard = { ...array[lastIndex] };
    newCard.matched = true;
    array[index] = newCard;
    if ( lastIndex !== -1 ) {
      lastCard.matched = true;
      array[lastIndex] = lastCard;
    }
    let numMatches = this.state.numPlayerMatches + 1;
    let numPlayerAttempts = this.state.numPlayerAttempts + 1;
    this.setState({ lastClickedValue: null, lastClickedIndex: null, deckOfCards: array, numPlayerMatches: numMatches, numPlayerAttempts: numPlayerAttempts, blockclick: false })
  }

  noMatchDetected = ( currentIndex, lastIndex, array ) => {
      //get the cards from the array by deep copy.
      let newCard = { ...array[currentIndex] };
      let lastCard = { ...array[lastIndex] };
     
      newCard.matched = false;
      newCard.facedown = true;
      array[currentIndex] = newCard;
      
      if ( this.state.lastClickedIndex !== null ) {
        lastCard.matched = false;
        lastCard.facedown = true;
        array[lastIndex] = lastCard;
      }

      let numPlayerAttempts = this.state.numPlayerAttempts + 1;
      this.setState({ lastClickedValue: null, lastClickedIndex: null, deckOfCards: array, numPlayerAttempts: numPlayerAttempts, blockclick: false })
  }

  onStartButtonClicked = () => {
    this.selectAndSuffleCards();
    const startGame = true;
    this.setState({ gameStarted: startGame })
  }

  onGameOver = () => {
    this.setState({ deckOfCards: [] , gameStarted: false, numPlayerMatches: 0, numPlayerAttempts: 0 })
  }

  render() {
    let bodyHtml = '';
    // here is how we know that the game is over
    if ( ( this.state.numPlayerMatches === this.state.maxMatches ) ) {
      bodyHtml = <GameOver clicked={() => this.onGameOver() } />
    }
    else if (this.state.deckOfCards && this.state.gameStarted )
    {
      
      bodyHtml = this.state.deckOfCards.map(( card , index ) => {
        return (
          <Card key={index}
            class='col-1'
            imagePath={card.image}
            matched={card.matched}
            facedown={card.facedown}
            clicked={(e) => this.onCardClicked(index, e) } />
        )
      });
    } 
    else
    {
      bodyHtml = <StartGame clicked={() => this.onStartButtonClicked() }/>
    }

    let scoreboardHtml = "";
    if ( this.state.gameStarted ) {
      scoreboardHtml = <Scoreboard attempts={this.state.numPlayerAttempts} matches={this.state.numPlayerMatches}/>
    }

    return (
      <div className="container">
        <div className="grid-container outline">
          {scoreboardHtml}
          {bodyHtml}
        </div>
      </div>
    );
  }
}

export default App;
