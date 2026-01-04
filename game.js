let startButton, tiltButton, calibrateButton, clickButton;
let buttonArea, gameField;
let isTiltActivated = false;
let isClickActivated = false;

let timer = 60;
let score = 0;
let correctAnswer = 0;
let interval;
let betaNeutral = 0;
let alphaNeutral = 0;
let lastEvent = {alpha: 0, beta: 0};
let poll_interval;
let waitingForNeutral = false;
let questionReady = false;
let checkNeutralInterval;
let listener;
let gameQuestion;

document.addEventListener('DOMContentLoaded', () => {
    startButton = document.getElementById("btnStart");
    tiltButton = document.getElementById("btnTilt");
    calibrateButton = document.getElementById("btnCalibrate");
    clickButton = document.getElementById("btnClick");
    buttonArea = document.getElementById("ButtonArea");
	gameField = document.getElementById("GameField");
    addButtonListeners();
    initPage();
});	

function addButtonListeners() {
    startButton.addEventListener("click", () => {
        startRound();
    });
    
    tiltButton.addEventListener("click", () => {
        isTiltActivated = true;
        isClickActivated = false;
        removeUnpressable(startButton);
        removeUnpressable(calibrateButton);
    });
    calibrateButton.addEventListener("click", () => {
        selectCalibration();
    });


    clickButton.addEventListener("click", () =>{
        isClickActivated = true;
        isTiltActivated = false;
        removeUnpressable(startButton);
        addUnpressable(calibrateButton);
    });
}


function initPage() {
    addUnpressable(calibrateButton);
    addUnpressable(startButton);
}

function startRound() {
    buttonArea.classList.add("hidden");
	gameField.classList.remove("hidden");
	gameQuestion = new Question();
	startGame();

}

function selectCalibration(){
    window.addEventListener("deviceorientation",calibrate);
}

function calibrate(event){
    betaNeutral = event.beta;
    alphaNeutral = event.alpha;
    window.removeEventListener("deviceorientation",calibrate);
}

function addActive(btn) { btn.classList.add("selected");}
function removeActive(btn) { btn.classList.remove("selected");}
function addUnpressable(btn) { btn.classList.add("unpressable");}
function removeUnpressable(btn) { btn.classList.remove("unpressable");}


function randInt(min, max){ 
	return Math.floor(Math.random() * ( max - min )) + min; 
}

class Question {
	static maxNonMultValue = 49;
	static maxMultValue = 10;
	static operators = ["+", "-", "*"];

	static optionsAmount = 4;
	static optionsMaxShiftValue = 10;

	constructor() {
		this.firstValue = null;
		this.operator = null;
		this.secondValue = null;
		this.correctAnswer = null;
		this.answerOptions = new Array(Question.optionsAmount);
	}

	#generateOperator(){
		this.operator = Question.operators[randInt(0, Question.operators.length)];
	}

	#generateValues(max){
		this.firstValue = randInt(0, max);
		this.secondValue = randInt(0, max);
	}

	#generateOptions(){
		this.answerOptions[0] = this.correctAnswer;
		for (let index = 1; index < this.answerOptions.length; index++) {
			
			let optionVal = null;
			do {
				let randQuestionShift = randInt(-Question.optionsMaxShiftValue, Question.optionsMaxShiftValue);
				optionVal = this.correctAnswer + randQuestionShift;

			} while ( (optionVal) < 0 || this.answerOptions.includes(optionVal) )

			this.answerOptions[index] = optionVal;
		}
		this.answerOptions = this.answerOptions.sort(function(){return Math.random() - 0.5});
	}

	generateNewQuestion(){
		this.#generateOperator();

		if (this.operator === "+"){
			this.#generateValues(Question.maxNonMultValue);
			this.correctAnswer = this.firstValue + this.secondValue;
		}
		else if( this.operator === "-"){
			this.#generateValues(Question.maxNonMultValue);

			if (this.firstValue < this.secondValue){
				const temp = this.firstValue;
				this.firstValue = this.secondValue;
				this.secondValue = temp;
			}
			this.correctAnswer = this.firstValue - this.secondValue;
		}
		else if( this.operator === "*"){
			this.#generateValues(Question.maxMultValue);
			this.correctAnswer = this.firstValue * this.secondValue;
		} else{
			console.log("THERE WAS A MAJOR ERROR");
			return;
		}

		this.#generateOptions();
	}

	checkOption(optionNumber){
		return this.answerOptions[optionNumber] === this.correctAnswer;
	}
	
	checkValue(value){
		return this.correctAnswer === value;
	}

	getString(){
		return this.firstValue + " " + this.operator + " " + this.secondValue + " = ?" ;
	}
}

function startGame(){
	score = 0;
	timer = 60;
	document.getElementById("score").innerText = score;
	document.getElementById("timer").innerText = timer;
	if(isTiltActivated){

		window.addEventListener("deviceorientation", listenToSensors);
		poll_interval = setInterval(tilt_answer,50);
	}
	startTimer();
	newQuestion();
}

function startTimer(){
	interval = setInterval(tick,1000);
}

function tick(){
	timer--;
	document.getElementById("timer").innerText = timer;
	if(timer < 0){
		clearInterval(interval);
		endGame();
	}
}

function newQuestion() {
	// Prepare a new question
	gameQuestion.generateNewQuestion();

	document.getElementById("question").innerText = gameQuestion.getString();
	document.getElementById('ans1').innerText = gameQuestion.answerOptions[0];
	document.getElementById('ans2').innerText = gameQuestion.answerOptions[1];
	document.getElementById('ans3').innerText = gameQuestion.answerOptions[2];
	document.getElementById('ans4').innerText = gameQuestion.answerOptions[3];
	questionReady = true;
}

function answer(button) {
	
	if (gameQuestion.checkOption(button - 1)){
		score++
	}else{
		score--;
	}
	
	document.getElementById("score").innerText = score;

	newQuestion();
}

function tilt_answer() {
	if(!questionReady || waitingForNeutral){
		return;
	}
	
	questionReady = false;

	let alpha = lastEvent.alpha;
	let beta = lastEvent.beta;
	
	let alphaTilt = (alpha - alphaNeutral + 540) % 360 - 180;
	let betaTilt = beta - betaNeutral;
	
	let selected_button = null;
	
	if (alphaTilt >= 30){
		selected_button = 2;
	}else if (alphaTilt <= -30){
		selected_button = 1;
	}else if(betaTilt >= 30){
		selected_button = 3;
	}else if (betaTilt <= -30){
		selected_button = 4;
	}
	
	if (selected_button != null){
		waitingForNeutral = true;
		answer(selected_button);
	}else{
		questionReady = true;
	}
	
	if(waitingForNeutral){
		checkNeutralInterval = setInterval(checkNeutral,50);
	}
}

function checkNeutral(){
	let alpha = lastEvent.alpha;
	let beta = lastEvent.beta;
	
	let alphaTilt = (alpha - alphaNeutral + 540) % 360 - 180;
	let betaTilt = beta - betaNeutral;
	
	if(Math.abs(alphaTilt) < 10 && Math.abs(betaTilt) < 10){
		clearInterval(checkNeutralInterval);
		waitingForNeutral = false;
	}
}

function listenToSensors(event){
	lastEvent.alpha = event.alpha;
	lastEvent.beta = event.beta;
}

function endGame(){
	gameField.classList.add("hidden");
	document.getElementById("result").classList.remove("hidden");

	document.getElementById("result").innerHTML = `<p>Time is up! Your Score: ${score}</p>`;
	window.removeEventListener("deviceorientation",listenToSensors);
	clearInterval(poll_interval);
}
