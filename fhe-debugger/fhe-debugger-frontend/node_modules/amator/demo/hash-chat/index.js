var amator = require('../../index.js');
var queryState = require('query-state');

var qs = queryState({
  text: 'hello world'
});


var currentUrl = document.getElementById('current-url');
var inputText = document.getElementById('text-input');
inputText.addEventListener('keyup', updateQueryState);
inputText.addEventListener('blur', updateQueryState);
inputText.addEventListener('keydown', handleKeyDown);

document.body.addEventListener('click', function() {
  inputText.focus();
})

function handleKeyDown(e) {
  updateQueryState();
  if (e.which === 13) {
    animateText(qs.get('text'));
    currentUrl.focus();
    currentUrl.select();
  }
}

function updateQueryState() {
  qs.set('text', inputText.value);
  currentUrl.value = window.location.href;
}

function updateInputBox(appState) {
  inputText.value = appState.name || '';
}

qs.onChange(function(appState) {
  animateText(appState.text);
  updateInputBox(appState.text);
});

var scene = document.querySelector('.scene');
animateText(qs.get('text'));
function animateText(text) {
  var letters = [];
  amator.sharedScheduler.clearAll();
  scene.innerHTML = '';

  Array.from(text).forEach(function (letter, idx, arr){ 
    let wrapper = document.createElement('span');
    wrapper.classList.add('letter')
    wrapper.innerText = letter;
    scene.appendChild(wrapper);
    letters.push(wrapper);
    var translateDirection = idx < arr.length / 2 ? -1 : 1;
    scheduleAnimation(wrapper, translateDirection);
  });
}
 
function scheduleAnimation(dom, translateDirection) {  
  var fadeOutAfter = Math.random() * 1500 + 500;
  var fadeOutDuration = Math.random() * 2000 + 500;
  var offsetLength = translateDirection * (Math.random() * 35 + 35); 

  
  setTimeout(fadeOutAnimation, fadeOutAfter)
  setTimeout(moveOutAnimation, fadeOutAfter * 1.1)
  setTimeout(blurAnimation, fadeOutAfter * 0.9)
  
  function fadeOutAnimation() {
    amator(
      { opacity: 1.0 },
      { opacity: 0.  }, 
      { 
        scheduler: amator.sharedScheduler,
        duration: fadeOutDuration,
        step: function(v) {
          dom.style.opacity = v.opacity;
        } 
      }
    ); 
  }
  
  function moveOutAnimation() {
    amator(
      { left: 0.0 }, 
      { left: offsetLength },
      {  
        scheduler: amator.sharedScheduler,
        duration: fadeOutDuration,
        step: function(v) {
          dom.style.transform = 'translateX(' + v.left + 'px)';
        } 
    });
  }
  
  function blurAnimation() {
    amator(
      { blur: 0.0 },
      { blur: 5 }, 
      {  
        scheduler: amator.sharedScheduler,
        duration: fadeOutDuration,
        step: function(v) {
          dom.style.filter = 'blur(' + v.blur + 'px)';
        } 
      });
  }
}
