document.addEventListener('DOMContentLoaded', () => {
    // Получение элементов DOM
    const lengthInput = document.getElementById('password-length');
    const chkUppercase = document.getElementById('chk-uppercase');
    const chkLowercase = document.getElementById('chk-lowercase');
    const chkNumbers = document.getElementById('chk-numbers');
    const presetSelect = document.getElementById('chars-preset');
    const specialCharsInput = document.getElementById('special-chars');
    const btnGenerate = document.getElementById('btn-generate');
    const resultDisplay = document.getElementById('result-display');
    const btnCopy = document.getElementById('btn-copy');
    const copyToast = document.getElementById('copy-toast');
    const strengthBar = document.getElementById('strength-bar');

    // Наборы символов
    const CHARS = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789'
    };

    // Наборы пресетов для спецсимволов
    const PRESETS = {
        standard: '!@#\$%&()_?,',
        strict: '!@#\$_-',
        minimal: '!@*',
        custom: ''
    };

    // 1. Валидация длины пароля (Границы 4-64)
    lengthInput.addEventListener('change', () => {
        let value = parseInt(lengthInput.value, 10);
        if (isNaN(value) || value < 4) value = 4;
        if (value > 64) value = 64;
        lengthInput.value = value;
    });

    // 2. Логика пресетов
    presetSelect.addEventListener('change', () => {
        const selectedPreset = presetSelect.value;
        if (selectedPreset !== 'custom') {
            specialCharsInput.value = PRESETS[selectedPreset];
        }
        validateControls();
    });

    // Если пользователь редактирует поле руками, переключаем селект на "Власний набір"
    specialCharsInput.addEventListener('input', () => {
        presetSelect.value = 'custom';
        validateControls();
    });

    // Следим за чекбоксами для своевременного отключения кнопки генерации
    [chkUppercase, chkLowercase, chkNumbers].forEach(element => {
        element.addEventListener('change', validateControls);
    });

    // Функция проверки: активна ли кнопка генерации
    function validateControls() {
        const anyCheckboxChecked = chkUppercase.checked || chkLowercase.checked || chkNumbers.checked;
        const hasSpecialChars = specialCharsInput.value.length > 0;

        if (!anyCheckboxChecked && !hasSpecialChars) {
            btnGenerate.disabled = true;
        } else {
            btnGenerate.disabled = false;
        }
    }

    // 3. Криптографически стойкий генератор случайных чисел в диапазоне [0, max - 1]
    function getSecureRandomInt(max) {
        const byteLength = 1;
        const randomArray = new Uint8Array(byteLength);
        const maxRange = 256 - (256 % max);
        
        while (true) {
            window.crypto.getRandomValues(randomArray);
            if (randomArray[0] < maxRange) {
                return randomArray[0] % max;
            }
        }
    }

    // 4. Криптографическая тасовка Фишера-Йейтса (Fisher-Yates Shuffle)
    function secureShuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = getSecureRandomInt(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 5. Основная функция генерации пароля
    function generatePassword() {
        const length = parseInt(lengthInput.value, 10);
        let pool = '';
        let guaranteedCharacters = [];

        // Собираем доступные символы и гарантируем наличие минимум одного символа из каждой группы
        if (chkUppercase.checked) {
            pool += CHARS.uppercase;
            guaranteedCharacters.push(CHARS.uppercase[getSecureRandomInt(CHARS.uppercase.length)]);
        }
        if (chkLowercase.checked) {
            pool += CHARS.lowercase;
            guaranteedCharacters.push(CHARS.lowercase[getSecureRandomInt(CHARS.lowercase.length)]);
        }
        if (chkNumbers.checked) {
            pool += CHARS.numbers;
            guaranteedCharacters.push(CHARS.numbers[getSecureRandomInt(CHARS.numbers.length)]);
        }
        
        const specialChars = specialCharsInput.value;
        if (specialChars.length > 0) {
            pool += specialChars;
            guaranteedCharacters.push(specialChars[getSecureRandomInt(specialChars.length)]);
        }

        // Если гарантированных символов больше, чем запрошенная длина (крайне редкий кейс для длины 4)
        if (guaranteedCharacters.length > length) {
            guaranteedCharacters = guaranteedCharacters.slice(0, length);
        }

        // Заполняем оставшуюся часть пароля случайными символами из пула
        const remainingLength = length - guaranteedCharacters.length;
        for (let i = 0; i < remainingLength; i++) {
            const randomIndex = getSecureRandomInt(pool.length);
            guaranteedCharacters.push(pool[randomIndex]);
        }

        // Выполняем финальное перемешивание всего массива символов
        const shuffledPasswordArray = secureShuffle(guaranteedCharacters);
        const finalPassword = shuffledPasswordArray.join('');

        // Вывод результата
        resultDisplay.value = finalPassword;

        // Расчет и обновление индикатора надежности
        updateStrengthBar(finalPassword, pool.length);
    }

    // 6. Оценка надежности пароля и кастомный цвет (от оранжевого до голубого)
    function updateStrengthBar(password, poolSize) {
        if (!password) {
            strengthBar.style.width = '0%';
            return;
        }

        // Вычисляем информационную энтропию: E = L * log2(R)
        const entropy = password.length * Math.log2(poolSize);
        
        // Нормализуем значение для шкалы (энтропия 100+ бит считается идеальной)
        let percentage = Math.min((entropy / 100) * 100, 100);
        
        // Устанавливаем ширину индикатора
        strengthBar.style.width = `${percentage}%`;

        // Плавный расчет цвета: от насыщенного оранжевого до чистого голубого
        // Оранжевый (слабый): rgb(234, 114, 43) -> Голубой (сильный): rgb(59, 130, 246)
        const factor = percentage / 100;
        const r = Math.round(234 + (59 - 234) * factor);
        const g = Math.round(114 + (130 - 114) * factor);
        const b = Math.round(43 + (246 - 43) * factor);

        strengthBar.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }

    // 7. Функция копирования
    async function copyToClipboard() {
        const password = resultDisplay.value;
        if (!password || password === 'The password will go here...') return;

        try {
            await navigator.clipboard.writeText(password);
            
            // Показ уведомления "Скопійовано!" на 2 секунды
            copyToast.classList.add('show');
            setTimeout(() => {
                copyToast.classList.remove('show');
            }, 2000);
        } catch (err) {
            console.error('Не вдалося скопіювати текст: ', err);
        }
    }

    // Назначение событий на кнопки
    btnGenerate.addEventListener('click', generatePassword);
    btnCopy.addEventListener('click', copyToClipboard);

    // Первичная проверка состояния органов управления при загрузке
    validateControls();
});
