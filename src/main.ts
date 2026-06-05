import {BedScene} from './BedScene';
import './style.css';

const bedEngine = new BedScene('canvas-container');

// --- State and Limits ---
type Part = 'head' | 'thigh' | 'toe' | 'hug';

// The actual target angles for the bed
const state: Record<Part, number> = {head: 0, thigh: 0, toe: 0, hug: 0};
// The numbers currently visible on the screen
const displayState: Record<Part, number> = {head: 0, thigh: 0, toe: 0, hug: 0};

const limits: Record<Part, { min: number; max: number }> = {
    head: {min: 0, max: 60},
    thigh: {min: 0, max: 45},
    toe: {min: -45, max: 40},
    hug: {min: 0, max: 35}
};

const bedAngles = {
    head: 0,
    toe: 0,
    thigh: 0,
    hug: 0
};

// Function to send data
async function updateBedPosition() {
    try {
        const response = await fetch('/api/bed-position', {
            method: 'POST', // Use POST for sending data
            headers: {
                'Content-Type': 'application/json',
            },
            // Send the actual 'state' object that holds your angles
            body: JSON.stringify(state),
        });
        const result = await response.json();
        console.log('Server response:', result);
    } catch (error) {
        console.error('Error sending position:', error);
    }
}

// Attach this to your button click listeners
document.getElementById('btn-head-up')?.addEventListener('click', () => {
    bedAngles.head += 5; // Example logic
    document.getElementById('head-val')!.innerText = `${bedAngles.head}°`;
    updateBedPosition(); // SEND AFTER CHANGE
});

function adjust(part: Part, amount: number) {
    let newVal = state[part] + amount;

    if (part === 'toe') {
        const maxAllowed = state.thigh > 0 ? 0 : limits.toe.max;
        const minAllowed = -state.thigh;

        if (newVal > maxAllowed) newVal = maxAllowed;
        if (newVal < minAllowed) newVal = minAllowed;

        state.toe = newVal;
    } else if (part === 'thigh') {
        if (newVal > limits.thigh.max) newVal = limits.thigh.max;
        if (newVal < limits.thigh.min) newVal = limits.thigh.min;
        state.thigh = newVal;

        if (state.thigh > 0 && state.toe > 0) state.toe = 0;
        if (state.toe < -state.thigh) state.toe = -state.thigh;
    } else {
        if (newVal > limits[part].max) newVal = limits[part].max;
        if (newVal < limits[part].min) newVal = limits[part].min;
        state[part] = newVal;
    }

    updateUI();
    updateBedPosition()
}

// --- Animation Loop for the UI Text ---
let isAnimatingText = false;

function animateNumbers() {
    let stillAnimating = false;

    (['head', 'thigh', 'toe', 'hug'] as Part[]).forEach(part => {
        if (displayState[part] !== state[part]) {
            stillAnimating = true;

            // Step the visible number by 1 towards the target state
            if (displayState[part] < state[part]) displayState[part]++;
            else if (displayState[part] > state[part]) displayState[part]--;

            const el = document.getElementById(`${part}-val`);
            if (el) el.innerText = `${displayState[part]}°`;
        }
    });

    if (stillAnimating) {
        // Run this again in 15 milliseconds for a fast, smooth counter effect
        setTimeout(animateNumbers, 15);
    } else {
        isAnimatingText = false;
    }
}

function updateUI() {
    // 1. Update Button Disabled States based on the TARGET state
    const maxToe = state.thigh > 0 ? 0 : limits.toe.max;
    const minToe = -state.thigh;

    (document.getElementById('btn-head-down') as HTMLButtonElement).disabled = (state.head <= limits.head.min);
    (document.getElementById('btn-head-up') as HTMLButtonElement).disabled = (state.head >= limits.head.max);

    (document.getElementById('btn-thigh-down') as HTMLButtonElement).disabled = (state.thigh <= limits.thigh.min);
    (document.getElementById('btn-thigh-up') as HTMLButtonElement).disabled = (state.thigh >= limits.thigh.max);

    (document.getElementById('btn-toe-down') as HTMLButtonElement).disabled = (state.toe <= minToe);
    (document.getElementById('btn-toe-up') as HTMLButtonElement).disabled = (state.toe >= maxToe);

    (document.getElementById('btn-hug-down') as HTMLButtonElement).disabled = (state.hug <= limits.hug.min);
    (document.getElementById('btn-hug-up') as HTMLButtonElement).disabled = (state.hug >= limits.hug.max);

    // 2. Send targets to 3D Engine immediately for smooth Lerping
    bedEngine.setRotations(state.head, state.thigh, state.toe, state.hug);

    // 3. Start the UI text counting animation if it isn't running
    if (!isAnimatingText) {
        isAnimatingText = true;
        animateNumbers();
    }
}

// --- Bind Event Listeners (Now using 5 degree jumps!) ---
document.getElementById('btn-head-down')?.addEventListener('click', () => adjust('head', -5));
document.getElementById('btn-head-up')?.addEventListener('click', () => adjust('head', 5));

document.getElementById('btn-thigh-down')?.addEventListener('click', () => adjust('thigh', -5));
document.getElementById('btn-thigh-up')?.addEventListener('click', () => adjust('thigh', 5));

document.getElementById('btn-toe-down')?.addEventListener('click', () => adjust('toe', -5));
document.getElementById('btn-toe-up')?.addEventListener('click', () => adjust('toe', 5));

document.getElementById('btn-hug-down')?.addEventListener('click', () => adjust('hug', -5));
document.getElementById('btn-hug-up')?.addEventListener('click', () => adjust('hug', 5));

document.getElementById('btn-reset')?.addEventListener('click', () => {
    state.head = 0;
    state.thigh = 0;
    state.toe = 0;
    state.hug = 0;
    updateUI();
    // @ts-ignore - Assuming you added resetCamera to BedScene.ts previously
    if (typeof bedEngine.resetCamera === 'function') bedEngine.resetCamera();
});

// Initial boot
updateUI();