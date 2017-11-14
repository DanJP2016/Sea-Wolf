var game = new Phaser.Game(800, 600, Phaser.CANVAS, '', {preload:preload, create:create, update:update});

var background;
var player;
var playerWeapon;
var cursors;
var fireButton;
var ships = ['battleship', 'patrol', 'cruiser', 'destroyer', 'tanker1', 'tanker2'];
var ship;
var target;
var sub;
var subs;
var mine;
var mines;
var spawnTimer;
var gameTimer;
var gameClock = 70;
var extraTime = 35;
var extendedTime = 5000;
var extTimeText;
var timeText;
var score = 0;
var startText;
var scoreText;
var stateText;
var fadeIn;
var fadeOut;
var powerUp;
var shipExplosion;
var torpFire;
var sonar;
var subspawn;
var explosions;
var sink;

function preload() {
	game.scale.pageAlignHorizontally = true;
	game.scale.pageAlignVertically = true;
	game.load.image('background', 'assets/backgrounds/underwater1.png');
	game.load.image('targetBox', 'assets/sprites/targetBox.png');
	game.load.image('torp', 'assets/sprites/torpedo.png');
	game.load.image('battleship', 'assets/sprites/battleship.png');
	game.load.image('cruiser', 'assets/sprites/cruiser.png');
	game.load.image('patrol', 'assets/sprites/patrol.png');
	game.load.image('destroyer', 'assets/sprites/destroyer.png');
	game.load.image('tanker1', 'assets/sprites/tanker1.png');
	game.load.image('tanker2', 'assets/sprites/tanker2.png');
	game.load.spritesheet('submarine', 'assets/sprites/submarine.png', 16, 10);
	game.load.image('mine', 'assets/sprites/mine.png');
	game.load.spritesheet('kaboom', 'assets/animations/mineBoom.png', 16, 16);
	game.load.spritesheet('sinking', 'assets/animations/sinkingShip.png', 16, 10);
	game.load.audio('powerUp', 'assets/sounds/Powerup4.wav');
	game.load.audio('shipExplosion', 'assets/sounds/Explosion.wav');
	game.load.audio('torpFire', 'assets/sounds/shoot.wav');
	game.load.audio('sonar', 'assets/sounds/sonar2.wav');
	game.load.audio('subspawn', 'assets/sounds/subspawn.wav');

};//end preload

function create() {
	//start physics system
	game.physics.startSystem(Phaser.Physics.ARCADE);

	//set antiAlias to false
	game.antiAlias = false;
	game.antialias = false;

	background = game.add.tileSprite(0, 0, game.width, game.height, 'background');

	//add game sounds
	powerUp = game.add.audio('powerUp');
	shipExplosion = game.add.audio('shipExplosion');
	torpFire = game.add.audio('torpFire');
	torpFire.volume = 0.3;
	sonar = game.add.audio('sonar');
	subspawn = game.add.audio('subspawn');

	//setup torpedos
	playerWeapon = game.add.weapon(4, 'torp');
	//scales the torp sprites while mantaining alighnment with the player sprite
	playerWeapon.bullets.setAll('scale.x', 2);
	playerWeapon.bullets.setAll('scale.y', 2);
	playerWeapon.bulletKillType = Phaser.Weapon.KILL_WORLD_BOUNDS;
	playerWeapon.bulletAngleOffset = 90;
	playerWeapon.bulletSpeed = 325;
	playerWeapon.fireRate = 100;
	playerWeapon.onFire.add(function() {
		if(!torpFire.isPlaying) {
			torpFire.play();
		}
	}, this);

	//setup player - targetBox
	player = game.add.sprite(0, 20, 'targetBox');
	player.scale.setTo(2, 2);
	player.anchor.setTo(0.5, 0.5);
	game.physics.enable(player, Phaser.Physics.ARCADE);
	player.body.collideWorldBounds = true;

	playerWeapon.trackSprite(player, 0, game.world.height - 20, false);

	//create ship group
	ship = game.add.group();

	//mine group
	mine = game.add.group();

	//sub group
	sub = game.add.group();

	//mine explosions
	explosions = game.add.group();
	explosions.createMultiple(10, 'kaboom');
	explosions.forEach(setup, this);

	//ship sinking
	sink = game.add.group();
	sink.createMultiple(10, 'sinking');
	sink.forEach(shipSetup, this);
	
	//spawn random ships at random intervals in random places
	spawnTimer = game.time.create(false);
	spawnTimer.loop(1500, spawnChance, this);

	//setup game timer - start at 70 seconds - add 35 seconds every 5000 points
	gameTimer = game.time.create(false);
	gameTimer.loop(1000, timerTrigger, this);

	//setup score board
	scoreText = game.add.text(game.world.width - 260, game.world.height - 30, 'Score: '+ score, 
				{font: '16px Press Start 2P', fill: '#ffffff'});
	scoreText.visible = true;

	//setup gameTimer board
	timeText = game.add.text(game.world.width / 2 - 20, game.world.height - 30, gameClock, 
				{font: '16px Press Start 2P', fill: '#ffffff'});
	timeText.visible = true;

	//setup extended time message
	extTimeText = game.add.text(game.world.width / 4, game.world.height / 2, 'Extended Patrol!', 
				{font: '24px Press Start 2P', fill: '#ffffff'});
	extTimeText.alpha = 0;

	//setup stateText 
	stateText = game.add.text(game.world.width / 5, game.world.height / 3, 'Game Over!  \n\nClick To Restart',
				{font: '32px Press Start 2P', fill: '#ffffff', align: 'center'});
	stateText.visible = false;

	//setup startText
	startText = game.add.text(game.world.width / 6, game.world.height / 3, 'Sea Wolf \n\n Click To Start !!',
				{font: '32px Press Start 2P', fill: '#ffffff', align: 'center'});
	startText.visible = true;

	//setup text fade tweens
	fadeIn = game.add.tween(extTimeText).to({alpha: 1}, 1000, 'Linear', true);
	fadeOut = game.add.tween(extTimeText).to({alpha: 0}, 1000, 'Linear', true);
	fadeIn.chain(fadeOut);

	//start game 
	game.input.onTap.addOnce(startGame, this);

	//setup controls and fire button
	cursors = game.input.keyboard.createCursorKeys();
	fireButton = this.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);

	
};//end create

function timerTrigger() {
	gameClock--;
	
	timeText.text = gameClock;

	if(score >= extendedTime) {
		gameClock += extraTime;
		extendedTime += 5000;
		fadeIn.start();
		powerUp.play();
	}

	if(gameClock == 0) {
		stateText.visible = true;
		gameTimer.stop(false);
		spawnTimer.stop(false);
		sonar.stop();
		game.input.onTap.addOnce(restart, this);
	}
}

function spawnChance() {
	var shipspawn = Phaser.Utils.chanceRoll(75);
	var subspawn = Phaser.Utils.chanceRoll(10);
	var minespawn = Phaser.Utils.chanceRoll(80);

	if(shipspawn == true && subspawn == true) {
		spawnSub();
	} else if(shipspawn) {
		spawnShip();
	} else if(subspawn) {
		spawnSub();
	} 

	if(minespawn) {
		spawnMine();
	}
}

function spawnShip() {
	var skin = Phaser.ArrayUtils.getRandomItem(ships);
	target = ship.create(Phaser.Utils.randomChoice(0, game.world.width), Phaser.Math.random(50, game.world.height / 2 + 50), skin);
	target.scale.setTo(3, 3);
	target.anchor.setTo(0.5, 0.5);
	game.physics.enable(target, Phaser.Physics.ARCADE);
	target.checkWorldBounds = true;
	target.events.onOutOfBounds.add(killOffScreen, this);

	Vel(target);
}

function Vel(target) {
	switch(target.key) {
		case 'patrol':  setVel(275);
		break;
		
		case 'battleship': setVel(225);
		break;

		case 'cruiser': setVel(200);
		break;

		case 'destroyer': setVel(225);
		break;

		case 'tanker1': setVel(100);
		break;

		case 'tanker2': setVel(100);
		break;
		
		default: setVel(200);
		break;
	}
}

function setVel(speed) {
	if(target.position.x <= 0) {
		target.body.velocity.x = speed;
		//flip sprite to face the direction its moving
		target.scale.setTo(-3, 3);
	} else {
		target.body.velocity.x = -speed;
	}
}

function spawnSub() {
	subs = sub.create(Phaser.Utils.randomChoice(0, game.world.width), Phaser.Math.random(50, game.world.height / 2), 'submarine');
	subs.frame = 1;
	subs.scale.setTo(-3, 3);
	subs.anchor.setTo(0.5, 0.5);
	game.physics.enable(subs, Phaser.Physics.ARCADE);
	subs.checkWorldBounds = true;
	subs.events.onOutOfBounds.add(killOffScreen, this);
	subs.animations.add('submerge');
	subs.play('submerge', 1, false, false);

	if(subs.position.x <= 0) {
		subs.body.velocity.x = 225;
		//flip sprite to face the direction its moving
		subs.scale.setTo(3, 3);
	} else {
		subs.body.velocity.x = -225;
	}
	subspawn.play();
}

function spawnMine() {
	if(mine.children.length < 6) {
		mines = mine.create(Phaser.Math.random(0, game.world.width / 2), Phaser.Math.random(game.world.height / 2, game.world.height - 200), 'mine');
		mines.scale.setTo(2, 2);
		mines.anchor.setTo(0.5, 0.5);
		game.physics.enable(mines, Phaser.Physics.ARCADE);
		mines.checkWorldBounds = true;
		mines.events.onOutOfBounds.add(killOffScreen, this);
		mines.body.velocity.x = 50;
	} 
}

function setup(ele) {
	ele.scale.x = 3;
	ele.scale.y = 3;
	ele.anchor.x = 0.2;
	ele.anchor.y = 0.3;
	ele.animations.add('kaboom');
}

function shipSetup(ship) {
	ship.scale.x = 3;
	ship.scale.y = 3;
	ship.anchor.x = 0.5;
	ship.anchor.y = 0.5;
	ship.animations.add('sinking');
}

function killOffScreen(ele) {
	ele.kill();
	ele.destroy();
}

function restart() {
	sub.removeAll(true, false, false);
	mine.removeAll(true, false, false);
	ship.removeAll(true, false, false);
	gameClock = 70;
	score = 0;
	extendedTime = 5000;
	scoreText.text = 'Score: ' + score;
	timeText.text = gameClock;
	gameTimer.start();
	spawnTimer.start();
	sonar.loopFull(0.5);
	stateText.visible = false;
}

function startGame() {
	gameTimer.start();
	spawnTimer.start();
	sonar.loopFull(0.5);
	startText.visible = false;
}

function update() {

	//scale torp sprite 
	if(playerWeapon.bullets.children.length != 0) {
		scaleTorp(playerWeapon.bullets);
	}
	

	//move the targetBox
	if(cursors.left.isDown) {
		player.body.velocity.x = -300;
	} else if(cursors.right.isDown) {
		player.body.velocity.x = 300;
	} else {
		player.body.velocity.x = 0;
	}
	
	//fire torps
	if(fireButton.isDown && gameClock > 0) {
		playerWeapon.fire();
	}

	game.physics.arcade.collide(ship, playerWeapon.bullets, collisionHandler, null, this);
	game.physics.arcade.overlap(sub, playerWeapon.bullets, playerHitsSub, null, this);
	game.physics.arcade.overlap(mine, playerWeapon.bullets, playerHitsMine, null, this);

};//end update

//check torp position
function scaleTorp(bullet) {
	for(let i = 0; i < playerWeapon.bullets.children.length; i++) {
		if(playerWeapon.bullets.children[i].position.y == 200) {
			playerWeapon.bullets.children[i].scale.x = 1.5;
			playerWeapon.bullets.children[i].scale.y = 1.5;
		}

		if(playerWeapon.bullets.children[i].alive == false) {
			playerWeapon.bullets.children[i].scale.x = 2;
			playerWeapon.bullets.children[i].scale.y = 2;
		}
	}
}//end scaleTorp

function collisionHandler(target, bullet) {
	bullet.kill();
	target.kill();
	points(target);
	shipExplosion.play();
	ship.remove(target);

	var hit = sink.getFirstExists(false);
	hit.reset(target.body.x, target.body.y);
	hit.play('sinking', 30, false, true);

}

function points(target) {
	switch(target.key) {
		case 'patrol' : score += 500; scoreText.text = 'Score: ' + score;
		break;

		case 'battleship': score += 300; scoreText.text = 'Score: ' + score;
		break;

		case 'cruiser': score += 200; scoreText.text = 'Score: ' + score;
		break;

		case 'destroyer': score += 250; scoreText.text = 'Score: ' + score;
		break;

		case 'tanker1': score += 100; scoreText.text = 'Score: ' + score;
		break;

		case 'tanker2': score += 100; scoreText.text = 'Score: ' + score;
		break;

		case 'submarine': score += 1000; scoreText.text = 'Score: ' + score;
		break;
	}
}

function playerHitsMine(bomb, bullet) {
	bullet.kill();
	bomb.kill();
	shipExplosion.play();
	mine.remove(bomb);

	var kill = explosions.getFirstExists(false);
	kill.reset(bomb.body.x, bomb.body.y);
	kill.play('kaboom', 30, false, true);
}

function playerHitsSub(submarine, bullet) {
	bullet.kill();
	submarine.kill();
	points(submarine);
	shipExplosion.play();
	sub.remove(submarine);

	var hit = sink.getFirstExists(false);
	hit.reset(submarine.body.x, submarine.body.y);
	hit.play('sinking', 30, false, true);
}
