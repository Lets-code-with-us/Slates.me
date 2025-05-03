/**
 * Animation utility for smooth transitions
 */

interface AnimationOptions {
  duration: number;
  easing: 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad' | 'easeOutCubic';
  onProgress: (progress: number) => void;
  onComplete?: () => void;
}

// Easing functions
const easingFunctions = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1
};

/**
 * Animate a value from 0 to 1 with easing
 */
export const animate = (options: AnimationOptions): void => {
  const { 
    duration, 
    easing = 'easeOutCubic', 
    onProgress, 
    onComplete 
  } = options;
  
  const easingFn = easingFunctions[easing];
  const startTime = performance.now();
  
  // Use requestAnimationFrame for smoother animation
  const animationFrame = (currentTime: number) => {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const easedProgress = easingFn(progress);
    
    onProgress(easedProgress);
    
    if (progress < 1) {
      requestAnimationFrame(animationFrame);
    } else if (onComplete) {
      onComplete();
    }
  };
  
  requestAnimationFrame(animationFrame);
};

/**
 * Spring animation for natural feeling movements
 * (More advanced alternative to the basic easing animation)
 */
export const springAnimate = (options: {
  from: number;
  to: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}): { stop: () => void } => {
  const {
    from,
    to,
    stiffness = 170,
    damping = 26,
    mass = 1,
    onUpdate,
    onComplete
  } = options;
  
  let position = from;
  let velocity = 0;
  let isAnimating = true;
  
  const step = () => {
    if (!isAnimating) return;
    
    // Spring physics
    const springForce = stiffness * (to - position);
    const dampingForce = damping * velocity;
    const acceleration = (springForce - dampingForce) / mass;
    
    velocity += acceleration * 0.016; // assuming ~60fps (16ms)
    position += velocity * 0.016;
    
    onUpdate(position);
    
    // Check if we're close enough to stop
    const isComplete = 
      Math.abs(to - position) < 0.01 && 
      Math.abs(velocity) < 0.01;
    
    if (isComplete) {
      onUpdate(to); // Ensure we end exactly at target
      isAnimating = false;
      if (onComplete) onComplete();
    } else {
      requestAnimationFrame(step);
    }
  };
  
  requestAnimationFrame(step);
  
  return {
    stop: () => {
      isAnimating = false;
    }
  };
};