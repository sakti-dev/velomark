let activeCount = 0;

export const lockBodyScroll = (): void => {
  activeCount += 1;
  if (activeCount === 1) {
    document.body.style.overflow = "hidden";
  }
};

export const unlockBodyScroll = (): void => {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount === 0) {
    document.body.style.overflow = "";
  }
};
