import { BedScene } from './BedScene';
import './style.css';

const mqtt = (window as any).mqtt;

if (!mqtt) {
    console.error("MQTT library failed to load from the CDN!");
}

// --- MQTT Setup ---
const myDeviceId = Math.random().toString(36).substring(2, 9);
console.log('📱 App Started. My Device ID:', myDeviceId);

const brokerUrl = import.meta.env.VITE_MQTT_URL;

const client = mqtt.connect(brokerUrl, {
    username: import.meta.env.VITE_MQTT_USERNAME,
    password: import.meta.env.VITE_MQTT_PASSWORD
});

client.on('connect', () => {
    console.log('✅ Successfully connected to HiveMQ Cloud!');
    client.subscribe('bed/position/updates');
});

client.on('message', (topic: string, message: any) => {
    if (topic === 'bed/position/updates') {
        const payload = JSON.parse(message.toString());
        console.log(`📥 Received from ${payload.senderId}:`, payload.angles);

        // IGNORE OUR OWN MESSAGES to prevent stuttering
        if (payload.senderId === myDeviceId) {
            console.log('🔄 Ignored self-echo');
            return;
        }

        // It's from another device! Update our target state.
        state.head = payload.angles.head;
        state.thigh = payload.angles.thigh;
        state.toe = payload.angles.toe;
        state.hug = payload.angles.hug;

        console.log('🛏️ Updating UI from remote sync...');
        updateUI(); // Animate the 3D bed and text
    }
});

function publishBedPosition() {
    const payload = {
        senderId: myDeviceId,
        angles: state
    };
    console.log('📤 Publishing new position:', payload);
    // retain: true ensures new devices get the latest position immediately upon connecting
    client.publish('bed/position/updates', JSON.stringify(payload), { retain: true });
}

// --- Scene and State ---
const bedEngine = new BedScene('canvas-container');

type Part = 'head' | 'thigh' | 'toe' | 'hug';

const state: Record<Part, number> = { head: 0, thigh: 0, toe: 0, hug: 0 };
const displayState: Record<Part, number> = { head: 0, thigh: 0, toe: 0, hug: 0 };

const limits: Record<Part, { min: number; max: number }> = {
    head: { min: 0, max: 60 },
    thigh: { min: 0, max: 45 },
    toe: { min: -45, max: 40 },
    hug: { min: 0, max: 35 }
};

// --- Logic ---
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
    publishBedPosition(); // ONLY use MQTT to broadcast changes now
}

// --- Animation Loop for UI Text ---
let isAnimatingText = false;

function animateNumbers() {
    let stillAnimating = false;

    (['head', 'thigh', 'toe', 'hug'] as Part[]).forEach(part => {
        if (displayState[part] !== state[part]) {
            stillAnimating = true;
            if (displayState[part] < state[part]) displayState[part]++;
            else if (displayState[part] > state[part]) displayState[part]--;

            const el = document.getElementById(`${part}-val`);
            if (el) el.innerText = `${displayState[part]}°`;
        }
    });

    if (stillAnimating) {
        setTimeout(animateNumbers, 15);
    } else {
        isAnimatingText = false;
    }
}

function updateUI() {
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

    bedEngine.setRotations(state.head, state.thigh, state.toe, state.hug);

    if (!isAnimatingText) {
        isAnimatingText = true;
        animateNumbers();
    }
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
    publishBedPosition(); // Ensure other devices reset too!

    // @ts-ignore
    if (typeof bedEngine.resetCamera === 'function') bedEngine.resetCamera();
});

// Initial boot
updateUI();