import { useState, useEffect, useRef } from 'react';

// Define types for GameObject and Monster
type GameObject = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Monster = GameObject;

export default function App() {
  // Canvas reference and state variables
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [score, setScore] = useState<number>(0);

  // Use refs for game loop and previous time tracking
  const previousTimeRef = useRef<number | null>(null); // Initially null
  const requestRef = useRef<number | null>(null); // Initially null

  // Define the player object
  const player: GameObject = { x: 50, y: 50, width: 50, height: 50 };

  // Function to spawn monsters
  const spawnMonster = () => {
    const newMonster: Monster = {
      x: Math.random() * 300,
      y: Math.random() * 300,
      width: 50,
      height: 50,
    };
    setMonsters((prevMonsters) => [...prevMonsters, newMonster]);
  };

  // Function to check for collisions
  const isColliding = (
    obj1: GameObject,
    obj2: GameObject
  ) => {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    );
  };

  // Handle keydown events to move player
  const handleKeyDown = (e: KeyboardEvent) => {
    const step = 10;
    if (e.key === 'ArrowUp') player.y -= step;
    if (e.key === 'ArrowDown') player.y += step;
    if (e.key === 'ArrowLeft') player.x -= step;
    if (e.key === 'ArrowRight') player.x += step;
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Spawn monsters at intervals
  useEffect(() => {
    const interval = setInterval(spawnMonster, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update game loop with requestAnimationFrame
  useEffect(() => {
    const update = (time: number) => {
      if (previousTimeRef.current !== null) {
        const deltaTime = time - previousTimeRef.current; // Time difference
        setMonsters((prevMonsters) =>
          prevMonsters.map((monster) => ({
            ...monster,
            x: monster.x - (deltaTime * 0.05), // Update monster position
          }))
        );
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(update); // Request next frame
    };

    requestRef.current = requestAnimationFrame(update);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current); // Cleanup on unmount
      }
    };
  }, []);

  // Render the game objects on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw monsters and check for collisions
    ctx.fillStyle = 'red';
    monsters.forEach((monster) => {
      ctx.fillRect(monster.x, monster.y, monster.width, monster.height);
      if (isColliding(player, monster)) {
        setScore((prevScore) => prevScore + 1);
      }
    });
  }, [monsters]);

  return (
    <div>
      <h1>Midnight Trash Run 🦝</h1>
      <p>Score: {score}</p>
      <canvas ref={canvasRef} width={500} height={500} />
    </div>
  );
}