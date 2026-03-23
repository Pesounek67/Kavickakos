const API = 'http://lmpss3.dev.spsejecna.net/procedure.php';
let availableDrinks = [];
let drinkQuantities = {};

function toast(msg, err = false) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast' + (err ? ' err' : '');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function getIcon(name) {
    name = (name || '').toLowerCase();
    if (name.includes('mléko') || name.includes('mleko')) return '🥛';
    if (name.includes('espresso') || name.includes('káva') || name.includes('coffe')) return '☕';
    if (name.includes('voda')) return '💧';
    return '🥤';
}

const USER_STORAGE_KEY = 'lastCoffeeUser';

function saveUserMemory(userId) {
    localStorage.setItem(USER_STORAGE_KEY, userId);
    document.cookie = `${USER_STORAGE_KEY}=${userId}; max-age=${60 * 60 * 24 * 365}; path=/`;
}

function loadUserMemory() {
    let user = localStorage.getItem(USER_STORAGE_KEY);
    if (user) return user;

    const match = document.cookie.match(new RegExp('(^| )' + USER_STORAGE_KEY + '=([^;]+)'));
    if (match) return match[2];

    return null;
}

async function init() {
    try {
        document.getElementById('userSelect').addEventListener('change', function() {
            saveUserMemory(this.value);
        });

        const peopleRes = await fetch(API + '?cmd=getPeopleList');
        const peopleData = await peopleRes.json();
        
        const select = document.getElementById('userSelect');
        select.innerHTML = '<option value="" disabled selected>— Vyberte uživatele —</option>';
        
        const savedUserId = loadUserMemory();

        Object.values(peopleData).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.ID;
            opt.textContent = p.name;
            if (p.ID == savedUserId) opt.selected = true;
            select.appendChild(opt);
        });

        const drinksRes = await fetch(API + '?cmd=getTypesList');
        const drinksData = await drinksRes.json();
        availableDrinks = Object.values(drinksData);
        
        renderDrinks();

    } catch (e) {
        toast('Chyba při načítání dat API', true);
        console.error(e);
    }
}

function renderDrinks() {
    const container = document.getElementById('drinkList');
    container.innerHTML = '';

    availableDrinks.forEach(drink => {
        drinkQuantities[drink.typ] = 0; 

        const row = document.createElement('div');
        row.className = 'drink-row';
        row.innerHTML = `
            <div class="drink-info">
                <span class="drink-icon">${getIcon(drink.typ)}</span>
                ${drink.typ}
            </div>
            <div class="qty-control">
                <button class="qty-btn" onclick="updateQty('${drink.typ}', -1)">−</button>
                <div class="qty-val" id="qty-${drink.typ}">0</div>
                <button class="qty-btn" onclick="updateQty('${drink.typ}', 1)">+</button>
            </div>
        `;
        container.appendChild(row);
    });
}

function updateQty(drinkName, change) {
    let current = drinkQuantities[drinkName];
    let newVal = current + change;
    if (newVal < 0) newVal = 0; 
    
    drinkQuantities[drinkName] = newVal;
    
    const valElement = document.getElementById(`qty-${drinkName}`);
    valElement.textContent = newVal;
    
    if (newVal > 0) valElement.classList.add('active');
    else valElement.classList.remove('active');
}

async function odeslat() {
    const userSelect = document.getElementById('userSelect');
    const userId = userSelect.value;

    if (!userId) {
        toast('Vyberte uživatele!', true);
        return;
    }

    const payload = {
        user: userId,
        drinks: availableDrinks.map(drink => ({
            type: drink.typ,
            value: drinkQuantities[drink.typ]
        }))
    };

    const totalDrinks = payload.drinks.reduce((sum, d) => sum + d.value, 0);
    if (totalDrinks === 0) {
        toast('Vyberte alespoň jeden nápoj!', true);
        return;
    }

    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    btn.textContent = 'ODESÍLÁM...';

    try {
        const response = await fetch(API + '?cmd=saveDrinks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Chyba serveru');

        toast('✅ Úspěšně zaznamenáno!');
        
        availableDrinks.forEach(drink => {
            drinkQuantities[drink.typ] = 0;
            document.getElementById(`qty-${drink.typ}`).textContent = '0';
            document.getElementById(`qty-${drink.typ}`).classList.remove('active');
        });

    } catch (e) {
        toast('❌ ' + e.message, true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'ODESLAT';
    }
}

init();