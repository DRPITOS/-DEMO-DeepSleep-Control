import './style.css';
import {BedScene} from './BedScene';

// Initialize the 3D Engine
const bedEngine = new BedScene('canvas-container');

// --- State and Limits ---
type Part = 'head' | 'thigh' | 'toe' | 'hug';
const state: Record<Part, number> = {head: 0, thigh: 0, toe: 0, hug: 0};
const limits: Record<Part, { min: number; max: number }> = {
    head: {min: 0, max: 60},
    thigh: {min: 0, max: 45}, // New Thigh limit
    toe: {min: 0, max: 40},   // This now controls the downward knee bend
    hug: {min: 0, max: 35}
};

function adjust(part: Part, amount: number) {
    const newVal = state[part] + amount;
    if (newVal >= limits[part].min && newVal <= limits[part].max) {
        state[part] = newVal;
        updateUI();
    }
}

function updateUI() {
    (document.getElementById('head-val') as HTMLElement).innerText = `${state.head}°`;
    (document.getElementById('thigh-val') as HTMLElement).innerText = `${state.thigh}°`;
    (document.getElementById('toe-val') as HTMLElement).innerText = `${state.toe}°`;
    (document.getElementById('hug-val') as HTMLElement).innerText = `${state.hug}°`;

    (['head', 'thigh', 'toe', 'hug'] as Part[]).forEach(part => {
        (document.getElementById(`btn-${part}-down`) as HTMLButtonElement).disabled = (state[part] === limits[part].min);
        (document.getElementById(`btn-${part}-up`) as HTMLButtonElement).disabled = (state[part] === limits[part].max);
    });

    // Send 4 data points to Three.js now
    bedEngine.setRotations(state.head, state.thigh, state.toe, state.hug);
}

// --- Bind Event Listeners ---
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
});

updateUI();