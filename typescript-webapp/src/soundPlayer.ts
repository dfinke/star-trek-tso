// soundPlayer.ts
// Simple utility to play a sound effect by file path
export function playSoundEffect(path: string) {
    const audio = new Audio(path);
    audio.currentTime = 0;
    audio.play();
}
