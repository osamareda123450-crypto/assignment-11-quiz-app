// 1. كلاس السؤال
class Question {
  constructor(text, options, correctAnswer) {
    this.text = text;
    this.options = options;
    this.correctAnswer = correctAnswer;
  }

  isCorrect(answer) {
    return answer === this.correctAnswer;
  }
}

// 2. كلاس جلب وتجهيز الأسئلة (من API أو أسئلة احتياطية)
class QuizService {
  static decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  static shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
  }

  static async fetchQuestions(amount = 5, category = "", difficulty = "") {
    let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
    if (category) url += `&category=${category}`;
    if (difficulty) url += `&difficulty=${difficulty}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.response_code === 0 && data.results.length > 0) {
        return data.results.map((item) => {
          const questionText = this.decodeHTML(item.question);
          const correct = this.decodeHTML(item.correct_answer);
          const incorrect = item.incorrect_answers.map((ans) => this.decodeHTML(ans));
          const allOptions = this.shuffle([correct, ...incorrect]);
          return new Question(questionText, allOptions, correct);
        });
      }
      throw new Error("No questions returned");
    } catch (error) {
      // أسئلة احتياطية لو الإنترنت غير متاح
      return [
        new Question("What is the capital of Egypt?", ["Cairo", "Alexandria", "Giza", "Aswan"], "Cairo"),
        new Question("Which keyword creates a class in JS?", ["class", "struct", "object", "new"], "class"),
        new Question("Which planet is known as the Red Planet?", ["Earth", "Mars", "Jupiter", "Saturn"], "Mars"),
        new Question("What does HTML stand for?", ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlinks Text Mark Language"], "Hyper Text Markup Language"),
        new Question("How many continents are there on Earth?", ["5", "6", "7", "8"], "7")
      ].slice(0, amount);
    }
  }
}

// 3. كلاس إدارة اللعبة والنتيجة
class Quiz {
  constructor(questions) {
    this.questions = questions;
    this.currentIndex = 0;
    this.score = 0;
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  checkAnswer(selectedAnswer) {
    const current = this.getCurrentQuestion();
    const correct = current.isCorrect(selectedAnswer);
    if (correct) {
      this.score++;
    }
    return correct;
  }

  nextQuestion() {
    this.currentIndex++;
  }

  isFinished() {
    return this.currentIndex >= this.questions.length;
  }
}

// 4. كلاس الواجهة والمؤقت والتفاعل
class QuizUI {
  constructor(container) {
    this.container = container;
    this.quiz = null;
    this.timer = null;
    this.timeLeft = 15;
  }

  showSetupScreen() {
    this.container.innerHTML = `
      <div>
        <div class="form-group">
          <label for="category">Category</label>
          <select id="category">
            <option value="">Any Category</option>
            <option value="9">General Knowledge</option>
            <option value="18">Science: Computers</option>
            <option value="17">Science & Nature</option>
            <option value="21">Sports</option>
            <option value="23">History</option>
          </select>
        </div>

        <div class="form-group">
          <label for="difficulty">Difficulty</label>
          <select id="difficulty">
            <option value="">Any Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div class="form-group">
          <label for="amount">Number of Questions</label>
          <input type="number" id="amount" min="3" max="15" value="5" />
        </div>

        <button id="start-btn" type="button" class="primary-btn">
          <i class="fa-solid fa-play"></i> Start Quiz
        </button>
      </div>
    `;

    document.getElementById("start-btn").addEventListener("click", async () => {
      const category = document.getElementById("category").value;
      const difficulty = document.getElementById("difficulty").value;
      const amount = Number(document.getElementById("amount").value) || 5;

      this.container.innerHTML = `<div class="center-box"><p>Loading questions...</p></div>`;
      const questions = await QuizService.fetchQuestions(amount, category, difficulty);
      this.quiz = new Quiz(questions);
      this.renderQuestion();
    });
  }

  startTimer() {
    clearInterval(this.timer);
    this.timeLeft = 15;
    const timerEl = document.getElementById("timer-display");

    this.timer = setInterval(() => {
      this.timeLeft--;
      if (timerEl) timerEl.textContent = `${this.timeLeft}s`;

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.handleAnswer(null);
      }
    }, 1000);
  }

  renderQuestion() {
    if (this.quiz.isFinished()) {
      this.showResultScreen();
      return;
    }

    const question = this.quiz.getCurrentQuestion();
    const currentNum = this.quiz.currentIndex + 1;
    const total = this.quiz.questions.length;

    const optionsHtml = question.options
      .map(
        (opt) =>
          `<button type="button" class="option-btn" data-answer="${opt}">${opt}</button>`
      )
      .join("");

    this.container.innerHTML = `
      <div>
        <div class="top-bar">
          <span class="badge">Question ${currentNum} / ${total}</span>
          <span class="badge">Score: ${this.quiz.score}</span>
          <span class="badge timer"><i class="fa-regular fa-clock"></i> <span id="timer-display">15s</span></span>
        </div>
        <h2 class="question-text">${question.text}</h2>
        <div class="options">${optionsHtml}</div>
      </div>
    `;

    this.startTimer();

    this.container.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        clearInterval(this.timer);
        this.handleAnswer(btn.getAttribute("data-answer"), btn);
      });
    });
  }

  handleAnswer(selectedAnswer, clickedBtn = null) {
    const current = this.quiz.getCurrentQuestion();
    const buttons = this.container.querySelectorAll(".option-btn");

    if (selectedAnswer !== null) {
      const isRight = this.quiz.checkAnswer(selectedAnswer);
      if (clickedBtn) {
        clickedBtn.classList.add(isRight ? "correct" : "wrong");
      }
    }

    buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.getAttribute("data-answer") === current.correctAnswer) {
        btn.classList.add("correct");
      }
    });

    setTimeout(() => {
      this.quiz.nextQuestion();
      this.renderQuestion();
    }, 1000);
  }

  showResultScreen() {
    clearInterval(this.timer);
    const total = this.quiz.questions.length;
    const percentage = Math.round((this.quiz.score / total) * 100);

    this.container.innerHTML = `
      <div class="center-box">
        <h2>Quiz Completed!</h2>
        <div class="score-circle">${this.quiz.score} / ${total} (${percentage}%)</div>
        <p>${percentage >= 60 ? "Great job!" : "Keep practicing!"}</p>
        <button id="restart-btn" type="button" class="primary-btn">
          <i class="fa-solid fa-rotate-right"></i> Play Again
        </button>
      </div>
    `;

    document.getElementById("restart-btn").addEventListener("click", () => {
      this.showSetupScreen();
    });
  }
}

// تشغيل التطبيق
const gameArea = document.querySelector('[aria-label="Game area"]');
const app = new QuizUI(gameArea);
app.showSetupScreen();