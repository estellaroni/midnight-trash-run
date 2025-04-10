import React, { useState, useEffect, useRef } from 'react';
import { Ghost } from 'lucide-react';

const GAME_WIDTH = 1200; // Extended game width
const GAME_HEIGHT = 400;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 40;
const TRASH_WIDTH = 20;
const TRASH_HEIGHT = 30;
const HIDING_SPOT_WIDTH = 50;
const HIDING_SPOT_HEIGHT = 60;
const DUMPSTER_WIDTH = 80;
const DUMPSTER_HEIGHT = 60;
const CAFE_WIDTH = 100;
const CAFE_HEIGHT = 80;
const MONSTER_WIDTH = 30;
const MONSTER_HEIGHT = 40;
const LIGHT_RADIUS = 150;
const PLAYER_SPEED = 4;
const MONSTER_SPEED = 1.5;
const CAMERA_BUFFER = 300; // Buffer for camera scrolling

// Sound effects
const walkingSound = new Audio('https://cdnjs.cloudflare.com/ajax/libs/sound-effects/1.0.2/walking.mp3');
walkingSound.volume = 0.3;
walkingSound.loop = true;

const hidingSound = new Audio('https://cdnjs.cloudflare.com/ajax/libs/sound-effects/1.0.2/hiding.mp3');
hidingSound.volume = 0.5;

const trashSound = new Audio('https://cdnjs.cloudflare.com/ajax/libs/sound-effects/1.0.2/trash.mp3');
trashSound.volume = 0.6;

const monsterSound = new Audio('https://cdnjs.cloudflare.com/ajax/libs/sound-effects/1.0.2/monster.mp3');
monsterSound.volume = 0.4;

const GameComponent = () => {
  const [gameState, setGameState] = useState('playing'); // 'playing', 'gameOver', 'success'
  const [playerPosition, setPlayerPosition] = useState({ x: 100, y: GAME_HEIGHT / 2 });
  const [playerHasTrash, setPlayerHasTrash] = useState(true);
  const [isHiding, setIsHiding] = useState(false);
  const [currentHidingSpot, setCurrentHidingSpot] = useState(null);
  const [cameraOffset, setCameraOffset] = useState(0);
  const [keys, setKeys] = useState({
    w: false,
    a: false,
    s: false,
    d: false,
    e: false,
  });
  const [monsters, setMonsters] = useState([]);
  const [objective, setObjective] = useState('Take the trash to the dumpster');
  
  const requestRef = useRef();
  const previousTimeRef = useRef();
  const monsterSpawnTimerRef = useRef(0);
  const gameLoopTimerRef = useRef(0);
  
  // Game objects positions
  const cafe = { x: 50, y: GAME_HEIGHT - CAFE_HEIGHT - 20 };
  const dumpster = { x: GAME_WIDTH - 150, y: GAME_HEIGHT - DUMPSTER_HEIGHT - 20 };
  const hidingSpots = [
    { x: 200, y: GAME_HEIGHT - HIDING_SPOT_HEIGHT - 20 },
    { x: 400, y: GAME_HEIGHT - HIDING_SPOT_HEIGHT - 20 },
    { x: 600, y: GAME_HEIGHT - HIDING_SPOT_HEIGHT - 20 },
    { x: 800, y: GAME_HEIGHT - HIDING_SPOT_HEIGHT - 20 },
    { x: 1000, y: GAME_HEIGHT - HIDING_SPOT_HEIGHT - 20 },
  ];

  const resetGame = () => {
    setPlayerPosition({ x: 100, y: GAME_HEIGHT / 2 });
    setPlayerHasTrash(true);
    setIsHiding(false);
    setCurrentHidingSpot(null);
    setMonsters([]);
    setCameraOffset(0);
    setObjective('Take the trash to the dumpster');
    setGameState('playing');
    walkingSound.pause();
    monsterSound.pause();
  };

  const checkCollision = (obj1, obj1Width, obj1Height, obj2, obj2Width, obj2Height) => {
    return (
      obj1.x < obj2.x + obj2Width &&
      obj1.x + obj1Width > obj2.x &&
      obj1.y < obj2.y + obj2Height &&
      obj1.y + obj1Height > obj2.y
    );
  };
  
  const getNearestHidingSpot = () => {
    // Find the nearest hiding spot to the player
    let nearest = null;
    let nearestDistance = Infinity;
    
    for (let i = 0; i < hidingSpots.length; i++) {
      const spot = hidingSpots[i];
      const distance = Math.sqrt(
        Math.pow(playerPosition.x - spot.x, 2) + 
        Math.pow(playerPosition.y - spot.y, 2)
      );
      
      if (distance < nearestDistance && distance < 50) {
        nearestDistance = distance;
        nearest = i;
      }
    }
    
    return nearest;
  };

  // Handle key events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['w', 'a', 's', 'd', 'e'].includes(e.key)) {
        setKeys(prevKeys => ({ ...prevKeys, [e.key]: true }));
        
        if (e.key === 'e') {
          if (isHiding) {
            // If already hiding, come out
            setIsHiding(false);
            setCurrentHidingSpot(null);
            hidingSound.play();
          } else {
            // Check if near a hiding spot to hide
            const nearestSpot = getNearestHidingSpot();
            if (nearestSpot !== null) {
              setIsHiding(true);
              setCurrentHidingSpot(nearestSpot);
              hidingSound.play();
              walkingSound.pause();
            }
          }
        }
        
        if (['w', 'a', 's', 'd'].includes(e.key) && !isHiding) {
          walkingSound.play();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (['w', 'a', 's', 'd', 'e'].includes(e.key)) {
        setKeys(prevKeys => ({ ...prevKeys, [e.key]: false }));
        if (['w', 'a', 's', 'd'].includes(e.key) && !keys.w && !keys.a && !keys.s && !keys.d) {
          walkingSound.pause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      walkingSound.pause();
      monsterSound.pause();
    };
  }, [isHiding, playerPosition, keys]);

  // Update camera position based on player position
  useEffect(() => {
    if (!isHiding) {
      // Adjust camera offset based on player position
      let newOffset = cameraOffset;
      
      // If player is moving to the right and approaching the right edge of the visible area
      if (playerPosition.x - cameraOffset > 800 - CAMERA_BUFFER) {
        newOffset = playerPosition.x - (800 - CAMERA_BUFFER);
      }
      
      // If player is moving to the left and approaching the left edge of the visible area
      if (playerPosition.x - cameraOffset < CAMERA_BUFFER) {
        newOffset = playerPosition.x - CAMERA_BUFFER;
      }
      
      // Keep camera offset within bounds
      newOffset = Math.max(0, Math.min(GAME_WIDTH - 800, newOffset));
      
      if (newOffset !== cameraOffset) {
        setCameraOffset(newOffset);
      }
    }
  }, [playerPosition, isHiding]);

  // Main game loop
  const gameLoop = (time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      
      // Player movement
      if (gameState === 'playing' && !isHiding) {
        let newX = playerPosition.x;
        let newY = playerPosition.y;
        
        if (keys.a) newX -= PLAYER_SPEED;
        if (keys.d) newX += PLAYER_SPEED;
        if (keys.w) newY -= PLAYER_SPEED;
        if (keys.s) newY += PLAYER_SPEED;
        
        // Keep player within bounds
        newX = Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, newX));
        newY = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_HEIGHT, newY));
        
        setPlayerPosition({ x: newX, y: newY });
      }
      
      // Monster movement and collision detection
      setMonsters(prevMonsters => {
        const updatedMonsters = prevMonsters.map(monster => {
          // Move monster toward player if not hiding
          let newX = monster.x;
          let newY = monster.y;
          
          if (!isHiding) {
            // Chase the player
            if (monster.x < playerPosition.x) newX += MONSTER_SPEED;
            else if (monster.x > playerPosition.x) newX -= MONSTER_SPEED;
            
            if (monster.y < playerPosition.y) newY += MONSTER_SPEED;
            else if (monster.y > playerPosition.y) newY -= MONSTER_SPEED;
          } else {
            // Move away from player when hiding
            if (monster.x < playerPosition.x) newX -= MONSTER_SPEED * 2;
            else if (monster.x > playerPosition.x) newX += MONSTER_SPEED * 2;
            
            if (monster.y < playerPosition.y) newY -= MONSTER_SPEED * 0.5;
            else if (monster.y > playerPosition.y) newY += MONSTER_SPEED * 0.5;
            
            // Add a bit of randomness to movement
            newX += (Math.random() - 0.5) * MONSTER_SPEED;
            newY += (Math.random() - 0.5) * MONSTER_SPEED;
          }
          
          // Keep within bounds
          newX = Math.max(0, Math.min(GAME_WIDTH - MONSTER_WIDTH, newX));
          newY = Math.max(0, Math.min(GAME_HEIGHT - MONSTER_HEIGHT, newY));
          
          return { ...monster, x: newX, y: newY };
        });
        
        // Check for collision with monsters
        if (!isHiding && gameState === 'playing') {
          const collision = updatedMonsters.some(monster => 
            checkCollision(
              playerPosition, PLAYER_WIDTH, PLAYER_HEIGHT,
              monster, MONSTER_WIDTH, MONSTER_HEIGHT
            )
          );
          
          if (collision) {
            setGameState('gameOver');
            walkingSound.pause();
            monsterSound.play();
          }
        }
        
        return updatedMonsters;
      });
      
      // Spawn new monsters
      monsterSpawnTimerRef.current += deltaTime;
      if (monsterSpawnTimerRef.current > 2000 && monsters.length < (playerHasTrash ? 3 : 5)) {
        monsterSpawnTimerRef.current = 0;
        
        // Determine spawn position (from edges)
        const side = Math.floor(Math.random() * 4); // 0:top, 1:right, 2:bottom, 3:left
        let x, y;
        
        if (side === 0) {
          x = cameraOffset + Math.random() * 800;
          y = -MONSTER_HEIGHT;
        } else if (side === 1) {
          x = cameraOffset + 800;
          y = Math.random() * GAME_HEIGHT;
        } else if (side === 2) {
          x = cameraOffset + Math.random() * 800;
          y = GAME_HEIGHT;
        } else {
          x = cameraOffset - MONSTER_WIDTH;
          y = Math.random() * GAME_HEIGHT;
        }
        
        setMonsters(prevMonsters => [...prevMonsters, { x, y }]);
      }
      
      // Check for dumpster collision (to drop trash)
      if (playerHasTrash && gameState === 'playing') {
        if (checkCollision(
          playerPosition, PLAYER_WIDTH, PLAYER_HEIGHT,
          dumpster, DUMPSTER_WIDTH, DUMPSTER_HEIGHT
        )) {
          setPlayerHasTrash(false);
          setObjective('Return to the cafe');
          trashSound.play();
        }
      }
      
      // Check for cafe collision (to win)
      if (!playerHasTrash && gameState === 'playing') {
        if (checkCollision(
          playerPosition, PLAYER_WIDTH, PLAYER_HEIGHT,
          cafe, CAFE_WIDTH, CAFE_HEIGHT
        )) {
          setGameState('success');
          walkingSound.pause();
        }
      }
    }
    
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [playerPosition, monsters, isHiding, gameState, playerHasTrash]);

  // Draw game elements
  const renderGame = () => {
    if (gameState === 'gameOver') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
          <h2 className="text-3xl mb-4">Game Over!</h2>
          <p className="mb-6">You were caught by a monster.</p>
          <button 
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
            onClick={resetGame}
          >
            Try Again
          </button>
        </div>
      );
    }
    
    if (gameState === 'success') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
          <h2 className="text-3xl mb-4">Success!</h2>
          <p className="mb-6">You successfully took out the trash and made it back safely.</p>
          <button 
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
            onClick={resetGame}
          >
            Play Again
          </button>
        </div>
      );
    }
    
    return (
      <>
        {/* Background */}
        <rect width={GAME_WIDTH} height={GAME_HEIGHT} fill="#111" />
        
        {/* Light around player */}
        <radialGradient id="playerLight" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="70%" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <circle 
          cx={playerPosition.x - cameraOffset + PLAYER_WIDTH/2} 
          cy={playerPosition.y + PLAYER_HEIGHT/2} 
          r={LIGHT_RADIUS} 
          fill="url(#playerLight)" 
        />
        
        {/* Cafe - more cafe-like design */}
        <g transform={`translate(${cafe.x - cameraOffset},${cafe.y})`}>
          <rect 
            width={CAFE_WIDTH} 
            height={CAFE_HEIGHT} 
            fill="#D2691E"  // Changed color
          />
          <rect 
            x={10} 
            y={20} 
            width={30} 
            height={40} 
            fill="#8B4513" 
          />
          <rect 
            x={60} 
            y={20} 
            width={30} 
            height={40} 
            fill="#8B4513" 
          />
          <rect 
            x={20} 
            y={CAFE_HEIGHT - 20} 
            width={60} 
            height={20} 
            fill="#A52A2A" 
          />
          <text 
            x={CAFE_WIDTH/2} 
            y={15} 
            textAnchor="middle" 
            fill="white" 
            fontSize="12"
            fontWeight="bold"
          >
            CAFE
          </text>
        </g>
        
        {/* Dumpster with label */}
        <g transform={`translate(${dumpster.x - cameraOffset},${dumpster.y})`}>
          <rect 
            width={DUMPSTER_WIDTH} 
            height={DUMPSTER_HEIGHT} 
            fill="#2F4F4F" 
          />
          <rect 
            x={5} 
            y={-10} 
            width={DUMPSTER_WIDTH - 10} 
            height={10} 
            fill="#2F4F4F" 
          />
          <text 
            x={DUMPSTER_WIDTH/2} 
            y={DUMPSTER_HEIGHT/2} 
            textAnchor="middle" 
            fill="white" 
            fontSize="10"
            fontWeight="bold"
          >
            DUMPSTER
          </text>
        </g>
        
        {/* Player when hidden behind a box - draw first (behind hiding spots) */}
        {isHiding && currentHidingSpot !== null && (
          <g transform={`translate(${hidingSpots[currentHidingSpot].x - cameraOffset + 10},${hidingSpots[currentHidingSpot].y + 10})`}>
            <rect 
              width={PLAYER_WIDTH} 
              height={PLAYER_HEIGHT} 
              fill="#4682B4" 
              fillOpacity="0.5"
            />
            {playerHasTrash && (
              <rect 
                x={-TRASH_WIDTH} 
                y={PLAYER_HEIGHT/2 - TRASH_HEIGHT/2} 
                width={TRASH_WIDTH} 
                height={TRASH_HEIGHT} 
                fill="#3CB371" 
                fillOpacity="0.5"
              />
            )}
          </g>
        )}
        
        {/* Hiding Spots */}
        {hidingSpots.map((spot, index) => (
          <g key={index}>
            <rect 
              x={spot.x - cameraOffset} 
              y={spot.y} 
              width={HIDING_SPOT_WIDTH} 
              height={HIDING_SPOT_HEIGHT} 
              fill="#A0522D" 
            />
            <rect 
              x={spot.x - cameraOffset + 10} 
              y={spot.y + 15} 
              width={HIDING_SPOT_WIDTH - 20} 
              height={HIDING_SPOT_HEIGHT - 30} 
              fill="#8B4513" 
            />
            {/* Indicator if player is near enough to hide */}
            {!isHiding && 
              Math.sqrt(Math.pow(playerPosition.x - spot.x, 2) + Math.pow(playerPosition.y - spot.y, 2)) < 50 && (
              <text 
                x={spot.x - cameraOffset + HIDING_SPOT_WIDTH/2} 
                y={spot.y - 10} 
                textAnchor="middle" 
                fill="white" 
                fontSize="10"
              >
                Press E to hide
              </text>
            )}
            {/* Indicator if player is currently hiding here */}
            {isHiding && currentHidingSpot === index && (
              <text 
                x={spot.x - cameraOffset + HIDING_SPOT_WIDTH/2} 
                y={spot.y - 10} 
                textAnchor="middle" 
                fill="white" 
                fontSize="10"
              >
                Press E to unhide
              </text>
            )}
          </g>
        ))}
        
        {/* Monsters */}
        {monsters.map((monster, index) => (
          <g key={index} transform={`translate(${monster.x - cameraOffset},${monster.y})`}>
            <rect 
              width={MONSTER_WIDTH} 
              height={MONSTER_HEIGHT} 
              fill="#222" 
            />
            <circle cx={MONSTER_WIDTH/3} cy={MONSTER_HEIGHT/3} r={3} fill="white" />
            <circle cx={MONSTER_WIDTH*2/3} cy={MONSTER_HEIGHT/3} r={3} fill="white" />
          </g>
        ))}
        
        {/* Player when not hiding - draw last (on top) */}
        {!isHiding && (
          <g transform={`translate(${playerPosition.x - cameraOffset},${playerPosition.y})`}>
            <rect 
              width={PLAYER_WIDTH} 
              height={PLAYER_HEIGHT} 
              fill="#4682B4" 
            />
            {playerHasTrash && (
              <rect 
                x={-TRASH_WIDTH} 
                y={PLAYER_HEIGHT/2 - TRASH_HEIGHT/2} 
                width={TRASH_WIDTH} 
                height={TRASH_HEIGHT} 
                fill="#3CB371" 
              />
            )}
          </g>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-white">Midnight Trash Run</h1>
      <div className="mb-4 text-white text-lg">Objective: {objective}</div>
      <div className="mb-4 text-white text-sm">
        Controls: WASD to move, E to hide/unhide behind boxes
      </div>
      <div className="relative border-2 border-gray-700 overflow-hidden">
        <svg width={800} height={GAME_HEIGHT}>
          {renderGame()}
        </svg>
        
        {/* Game over overlay with restart button */}
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
            <h2 className="text-3xl mb-4">Game Over!</h2>
            <p className="mb-6">You were caught by a monster.</p>
            <button 
              className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors"
              onClick={resetGame}
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Success overlay with restart button */}
        {gameState === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white">
            <h2 className="text-3xl mb-4">Success!</h2>
            <p className="mb-6">You successfully took out the trash and made it back safely.</p>
            <button 
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition-colors"
              onClick={resetGame}
            >
              Play Again
            </button>
          </div>
        )}
      </div>
      <div className="mt-4 text-white text-sm">
        {isHiding ? "You are hiding! The monsters are moving away." : "Be careful, the monsters can see you!"}
      </div>
    </div>
  );
};

export default GameComponent;
