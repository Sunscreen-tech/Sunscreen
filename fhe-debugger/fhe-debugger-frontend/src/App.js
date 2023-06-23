import './App.css';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

function fetchFunction(setFunction) {

    fetch("http://localhost:8080/")
    .then(response => response.text())
    .then(data => setFunction(data))
    .catch(error => console.log(error));

}

function DisplayFunction() {
  const [f, setFunction] = useState("");

  useEffect(() => {
    fetchFunction(setFunction);
  }, []);

  const handleClick = () => {
    fetchFunction(setFunction);
  }

  return (
    <div>
      <button onClick = {handleClick}>test! </button>
      <h1>{f}</h1>
    </div>
  );
}

function App() {
  return(
    <div>
      <DisplayFunction />
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'));