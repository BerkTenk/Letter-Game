import gsap from "gsap";
import { Container, Graphics, Text, Sprite, Texture } from "pixi.js";
import { ALPHABET, GAME_HEIGHT, GAME_WIDTH, LETTER_SIZE, validWords } from "./index.js";
import Matter from "matter-js";

export default class Game extends Container {
  constructor(app) {
    super();
    this.app = app;
    this.word = "";
    this.point = 0;
    this.init();
    this.initPhysics();
    this.createFrame();
    this.createScoreScreen();
  }

  init() {
    this.interactive = true;
    this.on("pointerdown", this.onBubbleClick.bind(this));
    this.app.ticker.add(this.update, this);
  }

  initPhysics() {
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.ground = Matter.Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT, GAME_WIDTH, 80, { isStatic: true });
    Matter.World.add(this.world, this.ground);
    this.sortableChildren = true;
    for (let i = 0; i < 40; i++) {
      const character = ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
      const letter = new Text(character, {
        fontSize: LETTER_SIZE,
        fill: "0xffffff",
    });
    const texture = Texture.from("/assets/bubble-white.png");
    const sprite = new Sprite(texture);
    sprite.width = 60;
    sprite.height = 60;
      sprite.zIndex = -1;
      sprite.alpha = 0.2;
      sprite.position.set(letter.width / 2 - sprite.width / 2, letter.height / 2 - sprite.height / 2);
      this.addChild(sprite);
      const posX = Math.random() * (GAME_WIDTH - LETTER_SIZE);
      const posY = Math.random() * (GAME_HEIGHT - LETTER_SIZE);
      const body = Matter.Bodies.circle(posX, posY, LETTER_SIZE / 2);
      Matter.World.add(this.world, body);
      letter.body = body;
      letter.id = i; 
      letter.character = character;
      letter.isClicked = false;
      letter.addChild(sprite);
      this.addChild(letter);
    }
    this.app.ticker.add(() => this.update());
  }

  createFrame() {
    this.frame = new Container();
    this.frame.width = 150;
    this.frame.position.set(0, 50); 
    this.addChild(this.frame); 
    this.signsContainer = new Container();
    this.addChild(this.signsContainer);
    this.tick = Sprite.from("/assets/tick.png");
    this.tick.position.set(20, 20);
    this.tick.width = 40;
    this.tick.height = 40; 
    this.tick.interactive = true;
    this.tick.on("pointerdown", () => this.checkWord());
    this.signsContainer.addChild(this.tick);
    this.cross = Sprite.from("/assets/cross.png");
    this.cross.position.set(70, 20);
    this.cross.width = 40;
    this.cross.height = 40; 
    this.cross.interactive = true; 
    this.cross.on("pointerdown", () => this.clearWord()); 
    this.signsContainer.addChild(this.cross); 
  }

  createScoreScreen() {
    this.scoreScreen = new Container();
    this.scoreScreen.position.set(GAME_WIDTH - 100, 20); // Sağ üst köşede konumlandır
    this.addChild(this.scoreScreen); // Ana kapsayıcıya puan ekranını ekle
    this.scoreText = new Text("Score: " + this.point, { fontSize: 20, fill: "0xffffff" });
    this.scoreScreen.addChild(this.scoreText); // Puan ekranına puan metnini ekle
  }

  updateScore() {
    this.scoreText.text = "Score: " + this.point;
    this.createCongratulationsMessage();
  }
  createCongratulationsMessage() {
    if (this.point >= 4) {
      this.congratulationsMessage = new Text("Tebrikler, kazandınız!", { fontSize: 24, fill: "0xffffff" });
      this.congratulationsMessage.position.set(GAME_WIDTH / 2 - this.congratulationsMessage.width / 2, GAME_HEIGHT / 2 - this.congratulationsMessage.height / 2);
      this.addChild(this.congratulationsMessage);
    }
  }
  update() {
    Matter.Engine.update(this.engine);
    if (this.word.length > 4) {
      this.clearWord();
    }
    this.children.forEach((child, index) => {
      if (child instanceof Text && child.body) {
        if (child.body.position.x < 0) {
          Matter.Body.setPosition(child.body, { x: 0, y: child.body.position.y });
        } else if (child.body.position.x > GAME_WIDTH - LETTER_SIZE) {
          Matter.Body.setPosition(child.body, { x: GAME_WIDTH - LETTER_SIZE, y: child.body.position.y });
        }
        child.position.set(child.body.position.x, child.body.position.y);
      }
    });
  }

  onBubbleClick(event) {
    let clickedObject = event.target;
    if (clickedObject === this.tick || clickedObject === this.cross) {
      return;
    }
    let clickedX = event.data.global.x;
    let clickedY = event.data.global.y;
    let closestLetter = null;
    let closestDistance = Number.MAX_SAFE_INTEGER;
    this.children.forEach(child => {
      if (child instanceof Text && child.body) {
        let distance = Math.sqrt(Math.pow(child.position.x - clickedX, 2) + Math.pow(child.position.y - clickedY, 2));
        if (distance < closestDistance) {
          closestDistance = distance;
          closestLetter = child;
        }
      }
    });
    if (closestLetter) {
      closestLetter.isClicked = true;
      this.showClickedLetter(closestLetter);
    }
    this.word += closestLetter.character;
  }

  showClickedLetter(letter) {
    let clickedLetter = new Text(letter.character, { fontSize: LETTER_SIZE, fill: "0xffffff" });
    clickedLetter.position.set(this.frame.width +  LETTER_SIZE / 2, 20); // Harfin konumunu ayarla
    this.frame.addChild(clickedLetter); // Çerçeve içine harfi ekle
  }

  checkWord() {
    this.isWordValid();
    this.updateScore();
  }

  clearWord() {
    this.frame.removeChildren();
    this.word = "";
    this.children.forEach(child => {
      if (child instanceof Text && child.isClicked) {
        child.isClicked = false;
      }
    });
  }

  showNotification(message, isCorrect) {
    const notification = new Text(message, { fontSize: 24, fill: "0xffffff" });
    notification.position.set(GAME_WIDTH / 2 - notification.width / 2, GAME_HEIGHT / 2 - notification.height / 2);
    this.addChild(notification);
    const backgroundColor = isCorrect ? 0x00FF00 : 0xFF0000;
    const background = new Graphics();
    background.beginFill(backgroundColor, 0.5);
    background.drawRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    background.endFill();
    this.addChildAt(background, 0);
    gsap.to([notification, background], { duration: 2, alpha: 0, onComplete: () => {
        this.removeChild(notification);
        this.removeChild(background);
    }});
}

isWordValid() {
  let isCorrect = validWords.includes(this.word);
  if (isCorrect) {
    this.point++;
    this.explodeLetters();
    this.clearWord();
  } else {
    this.clearWord();
  }
  this.showNotification(isCorrect ? "Congratulations, that's the right word!" : "The word is not correct!", isCorrect);
}

  explodeLetters() {
    this.children.forEach(child => {
      if (child instanceof Text && child.isClicked) {
        this.removeChild(child);
        this.removeChild(child.body.render.sprite);
      }
    });
    this.addNewLetters();
}

addNewLetters() {
  for (let i = 0; i < 4; i++) {
    const character = ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    const letter = new Text(character, {
      fontSize: LETTER_SIZE,
      fill: "0xffffff",
  });
  const texture = Texture.from("/assets/bubble-white.png");
  const sprite = new Sprite(texture);
  sprite.width = 60;
  sprite.height = 60;
    sprite.zIndex = -1;
    sprite.alpha = 0.2;
    sprite.position.set(letter.width / 2 - sprite.width / 2, letter.height / 2 - sprite.height / 2);
    this.addChild(sprite);
    const posX = Math.random() * (GAME_WIDTH - LETTER_SIZE);
    const posY = 0;
    const body = Matter.Bodies.circle(posX, posY, LETTER_SIZE / 2);
    Matter.World.add(this.world, body);
    letter.body = body;
    letter.id = i; 
    letter.character = character;
    letter.isClicked = false;
    letter.addChild(sprite);
    this.addChild(letter);
  }
}
}