/**
 * Cria ripple effect ao clicar no botão
 */
export const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.classList.add('ripple-effect');

  const existingRipple = button.querySelector('.ripple-effect');
  if (existingRipple) {
    existingRipple.remove();
  }

  button.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);
};

/**
 * Trigger success animation
 */
export const triggerSuccessAnimation = (buttonRef: HTMLButtonElement | null) => {
  if (!buttonRef) return;
  
  buttonRef.classList.add('button-success');
  setTimeout(() => {
    buttonRef.classList.remove('button-success');
  }, 1000);
};

/**
 * Trigger error shake animation
 */
export const triggerErrorShake = (buttonRef: HTMLButtonElement | null) => {
  if (!buttonRef) return;
  
  buttonRef.classList.add('button-error-shake');
  setTimeout(() => {
    buttonRef.classList.remove('button-error-shake');
  }, 500);
};
