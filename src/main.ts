import { BedScene } from './BedScene';
import './style.css';

const mqtt = (window as any).mqtt;

if (!mqtt) {
    console.error("MQTT library failed to load from the CDN!");
}

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

        if (payload.senderId === myDeviceId) return;

        // Hug is removed from the incoming payload parsing
        state.head = payload.angles.head;
        state.thigh = payload.angles.thigh;
        state.toe = payload.angles.toe;
        state.tilt = payload.angles.tilt || 0;

        updateUI();
    }
});

function publishBedPosition() {
    const payload = {
        senderId: myDeviceId,
        angles: state
    };
    client.publish('bed/position/updates', JSON.stringify(payload), { retain: true });
}

const bedEngine = new BedScene('canvas-container');

// Removed 'hug' from Part
type Part = 'head' | 'thigh' | 'toe' | 'tilt';

// Removed 'hug' from State
const state: Record<Part, number> = { head: 0, thigh: 0, toe: 0, tilt: 0 };
const displayState: Record<Part, number> = { head: 0, thigh: 0, toe: 0, tilt: 0 };

const limits: Record<Part, { min: number; max: number }> = {
    head: { min: 0, max: 60 },
    thigh: { min: 0, max: 45 },
    toe: { min: -45, max: 40 },
    tilt: { min: -20, max: 20 }
};

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
    publishBedPosition();
}

let isAnimatingText = false;

function animateNumbers() {
    let stillAnimating = false;

    // Removed 'hug' from animation loop
    (['head', 'thigh', 'toe', 'tilt'] as Part[]).forEach(part => {
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

    const setDisabled = (id: string, condition: boolean) => {
        const btn = document.getElementById(id) as HTMLButtonElement;
        if (btn) btn.disabled = condition;
    }

    setDisabled('btn-head-down', state.head <= limits.head.min);
    setDisabled('btn-head-up', state.head >= limits.head.max);
    setDisabled('btn-thigh-down', state.thigh <= limits.thigh.min);
    setDisabled('btn-thigh-up', state.thigh >= limits.thigh.max);
    setDisabled('btn-toe-down', state.toe <= minToe);
    setDisabled('btn-toe-up', state.toe >= maxToe);

    // Removed hug from rotation call
    bedEngine.setRotations(state.head, state.thigh, state.toe);
    bedEngine.updateTilt(state.tilt);

    if (!isAnimatingText) {
        isAnimatingText = true;
        animateNumbers();
    }
}

document.getElementById('btn-head-down')?.addEventListener('click', () => adjust('head', -5));
document.getElementById('btn-head-up')?.addEventListener('click', () => adjust('head', 5));
document.getElementById('btn-thigh-down')?.addEventListener('click', () => adjust('thigh', -5));
document.getElementById('btn-thigh-up')?.addEventListener('click', () => adjust('thigh', 5));
document.getElementById('btn-toe-down')?.addEventListener('click', () => adjust('toe', -5));
document.getElementById('btn-toe-up')?.addEventListener('click', () => adjust('toe', 5));

const tiltButtons = document.querySelectorAll('.tilt-btn');
tiltButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const targetAngle = parseInt((e.target as HTMLButtonElement).dataset.angle || "0");
        state.tilt = targetAngle;
        updateUI();
        publishBedPosition();
    });
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
    state.head = 0;
    state.thigh = 0;
    state.toe = 0;
    state.tilt = 0;
    updateUI();
    publishBedPosition();

    // @ts-ignore
    if (typeof bedEngine.resetCamera === 'function') bedEngine.resetCamera();
});

// Initial boot
updateUI();