                        btn.innerText = 'ΕΙΣΟΔΟΣ';
                }
            }
            msgQueue.push(m);
            if (!isMsgShowing) showNextMsg();
        });

        socket.on('actionRejected', () => {
            actionLocked = false;
        });

        socket.on('invalidMove', () => {
            actionLocked = false; 
            msgQueue.push("⚠️ Άκυρη Κίνηση!");
            if (!isMsgShowing) showNextMsg();
            
            document.querySelectorAll('.hand-card').forEach(c => c.classList.add('shake')); 
            setTimeout(() => document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('shake')), 180); 
        });

        socket.on('updateUI', data => {
            actionLocked = false;
            window.currentScoreData = data;

            if (Array.isArray(data.players) && data.players.length) {
                scoreboardPlayers = data.players.slice();
            }

            document.getElementById('deck-count').innerText = data.deckCount;
            window.currentTopCard = data.topCard;
            window.currentActiveSuit = data.activeSuit;

            if (data.currentPlayerId && data.currentPlayerId !== lastPlayerId) {
                lastPlayerId = data.currentPlayerId;
                startTimer(60);
            }

            if (data.topCard && data.discardCount !== undefined && data.discardCount > lastDiscardCount) {
                addCardToPile(data.topCard);
                lastDiscardCount = data.discardCount;
            }

            const suitDisplay = document.getElementById('active-suit-display');
            if (suitDisplay) {
                if (data.activeSuit) {
                    suitDisplay.innerText = data.activeSuit;
                    suitDisplay.style.color = (data.activeSuit === '♥' || data.activeSuit === '♦') ? '#ff4444' : '#222';
                    suitDisplay.style.display = 'block';
                    suitDisplay.style.textShadow = "0 0 10px white, 0 0 20px white";
                } else {
                    suitDisplay.style.display = 'none';
                }
            }

            const ind = document.getElementById('turn-indicator');
            const handCont = document.getElementById('my-hand-container');
            if (ind && handCont) {
                if (data.isMyTurn) {
                    ind.innerText = data.penalty > 0 ? `⚠️ ΦΑΕ ${data.penalty}!` : "ΔΙΚΗ ΣΟΥ ΣΕΙΡΑ";
                    ind.style.borderColor = "#4f4";
                    ind.style.color = "#4f4";
                    handCont.classList.remove('not-my-turn');
                } else {
                    ind.innerText = `ΠΑΙΖΕΙ: ${data.currentPlayerName}`;
                    ind.style.borderColor = "#ff4444";
                    ind.style.color = "#ffdddd";
                    handCont.classList.add('not-my-turn');
                }
            }

            renderHand(data.myHand);
            distributePlayers(data.players, data.currentPlayerName, data.isMyTurn);
            updateDirectionIndicator(data.players, data.direction);
        });

        socket.on('revealHands', playersData => {
            clearGameTimer();
            lastPlayerId = null;
            document.getElementById('pile-container').innerHTML = '';
            lastDiscardCount = 0;

            const others = playersData.filter(p => p.id !== myId);
            const slots = ['slot-left', 'slot-top', 'slot-right'];
            
            others.forEach((p, i) => {
                const container = document.getElementById(slots[i]);
                if (container && p.hand) {
                    let cardsHtml = '';
                    p.hand.forEach((c, idx) => {
                        if (!c) return;
                        const color = (c.color === 'red') ? '#d00' : 'black';
                        cardsHtml += `<div class="card" style="color:${color}; z-index:${idx};">${c.value}<div style="font-size:18px; line-height:1;">${c.suit}</div></div>`;
                    });
                    
                    container.innerHTML = `
                        <div class="panel player-info" style="opacity: 1; z-index: 2000;">
                            <div class="player-name" style="font-weight:bold; font-size:18px;">${p.name}</div>
                            <div style="font-size:12px; color:#4f4; margin-top:3px;">Σκορ: ${p.totalScore}</div>
                        </div>
                        <div class="player-cards" style="margin-top: 10px;">${cardsHtml}</div>
                        <div class="card-count-box" style="opacity: 1">${p.hand.length} φύλλα</div>`;
                }
            });
        });

        socket.on('gameOver', msg => {
            clearGameTimer();
            document.getElementById('game-wrapper').style.filter = "blur(10px)";
            document.getElementById('victory-msg').innerText = msg;
            document.getElementById('victory-screen').style.display = 'flex';
        });

        socket.on('rejoinSuccess', data => {
            document.getElementById('login-area').style.display = 'none';

            if (Array.isArray(data.players) && data.players.length) {
                scoreboardPlayers = data.players.slice();
            }

            if (data.gameStarted) {
                document.getElementById('start-screen').style.display = 'none';
                fullScoreHistory = data.history || [];
                renderScoreboard();
                document.getElementById('scoreboard').style.display = 'block';
            } else {
                document.getElementById('waiting-area').style.display = 'block';
                document.getElementById('start-screen').style.display = 'flex';
            }
        });

        socket.on('updateScoreboard', data => {
            fullScoreHistory = data.history || [];

            if (Array.isArray(data.players) && data.players.length) {
                scoreboardPlayers = data.players.slice();
            }

            renderScoreboard();
            document.getElementById('scoreboard').style.display = 'block';
        });

        document.getElementById('my-hand-container').addEventListener('click', function(e) {
            const cardEl = e.target.closest('.hand-card');
            if (!cardEl) return;
            
            const index = parseInt(cardEl.getAttribute('data-index'), 10);
            const value = cardEl.getAttribute('data-value');
            const suit = cardEl.getAttribute('data-suit');
            
            playCardLogic(index, value, suit);
        });

        function renderHand(hand) {
            const container = document.getElementById('my-hand-container');
            if (!container) return;
            container.className = hand.length > 15 ? 'hand-compact' : 'hand-normal';
            
            const frag = document.createDocumentFragment();
            let overlap = (hand.length > 15) ? "-25px" : (hand.length > 8 ? "-60px" : "-55px");

            hand.forEach((c, i) => {
                if (!c) return;
                const div = document.createElement("div");
                const isRed = (c.suit === '♥' || c.suit === '♦');
                div.className = `card-base hand-card card-${i} ${isRed ? 'red' : ''}`;
                div.style.marginLeft = i === 0 ? "0px" : overlap;
                div.style.zIndex = i; 
                
                div.setAttribute('data-index', i);
                div.setAttribute('data-value', c.value);
                div.setAttribute('data-suit', c.suit);

                div.innerHTML = `
                    <div class="card-corner">${c.value}<div>${c.suit}</div></div>
                    <div class="card-center">${c.suit}</div>
                    <div class="card-corner bottom">${c.value}<div>${c.suit}</div></div>`;
                
                frag.appendChild(div);
            });

            container.innerHTML = "";
            container.appendChild(frag);
        }

        function playCardLogic(index, value, suit) {
            const handCont = document.getElementById('my-hand-container');
            if (handCont && handCont.classList.contains('not-my-turn')) return;
            if (actionLocked || Date.now() - lastClick < CLICK_DELAY) return;

            if (value === 'A') {
                const topCard = window.currentTopCard;
                const effectiveSuit = window.currentActiveSuit || (topCard ? topCard.suit : null);
                
                if (topCard && topCard.value === 'A' && suit === effectiveSuit) {
                    executePlayCard(index, null);
                    return;
                }

                selectedAceIndex = index;
                document.getElementById('ace-modal').style.display = 'flex';
                return;
            }

            executePlayCard(index, null);
        }

        function confirmAce(chosenSuit) {
            if (selectedAceIndex === null) return;
            executePlayCard(selectedAceIndex, chosenSuit);
            document.getElementById('ace-modal').style.display = 'none';
            selectedAceIndex = null;
        }

        function cancelAce() {
            selectedAceIndex = null;
            document.getElementById('ace-modal').style.display = 'none';
            actionLocked = false;
        }

        function createFlyingCardNode(isBack = false) {
            const clone = document.createElement('div');
            clone.className = isBack ? 'flying-card' : 'flying-card card-base';

            if (isBack) {
                clone.style.width = '77px';
                clone.style.height = '112px';
                clone.style.background = 'linear-gradient(135deg, #a00, #500)';
                clone.style.border = '2px solid white';
                clone.style.borderRadius = '5px';
            }

            return clone;
        }

        function animateCardFlight(fromRect, toRect, sourceScale = gameScale, rotateDeg = 0, isBack = false) {
            const clone = createFlyingCardNode(isBack);
            const startX = fromRect.left;
            const startY = fromRect.top;
            const endX = toRect.left;
            const endY = toRect.top;

            clone.style.left = '0px';
            clone.style.top = '0px';
            clone.style.opacity = '1';
            clone.style.transform = `translate3d(${startX}px, ${startY}px, 0) scale(${sourceScale}) rotate(0deg)`;

            document.body.appendChild(clone);

            requestAnimationFrame(() => {
                clone.style.transform = `translate3d(${endX}px, ${endY}px, 0) scale(${sourceScale}) rotate(${rotateDeg}deg)`;
                clone.style.opacity = '0.45';
            });

            setTimeout(() => {
                if (document.body.contains(clone)) clone.remove();
            }, ANIM_MS);

            return clone;
        }

        function executePlayCard(index, declaredSuit) {
            const cardElement = document.querySelector(`.card-${index}`);
            if (cardElement) animateThrow(cardElement);

            actionLocked = true;
            lastClick = Date.now();
            socket.emit('playCard', { index: index, declaredSuit: declaredSuit });
        }

        function triggerDrawAnimation() {
            const handCont = document.getElementById('my-hand-container');
            if (actionLocked || handCont.classList.contains('not-my-turn')) return;
            
            actionLocked = true;
            lastClick = Date.now();

            socket.emit('drawCard');

            const deckEl = document.getElementById('draw-pile');
            if (!deckEl || !handCont) return;

            const rectDeck = deckEl.getBoundingClientRect();
            const rectHand = handCont.getBoundingClientRect();

            const fromRect = {
                left: rectDeck.left,
                top: rectDeck.top,
                width: 77,
                height: 112
            };

            const toRect = {
                left: rectHand.left + rectHand.width / 2 - 38,
                top: rectHand.top - 20,
                width: 77,
                height: 112
            };

            animateCardFlight(fromRect, toRect, gameScale, 180, true);
        }

        function animateThrow(elem) {
            const pileContainer = document.getElementById('pile-container');
            if (!pileContainer || !elem) return;

            const rect = elem.getBoundingClientRect();
            const pileRect = pileContainer.getBoundingClientRect();

            const fromRect = {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height
            };

            const toRect = {
                left: pileRect.left,
                top: pileRect.top,
                width: rect.width,
                height: rect.height
            };

            const clone = elem.cloneNode(true);
            clone.className = 'flying-card card-base';
            clone.style.left = '0px';
            clone.style.top = '0px';
            clone.style.margin = '0';
            clone.style.opacity = '1';
            clone.style.transform = `translate3d(${fromRect.left}px, ${fromRect.top}px, 0) scale(${gameScale}) rotate(0deg)`;
            document.body.appendChild(clone);

            requestAnimationFrame(() => {
                clone.style.transform = `translate3d(${toRect.left}px, ${toRect.top}px, 0) scale(${gameScale}) rotate(${Math.random() * 24 - 12}deg)`;
                clone.style.opacity = '0.5';
            });
            
            setTimeout(() => {
                if (document.body.contains(clone)) clone.remove();
            }, ANIM_MS);
        }

        function addCardToPile(c) {
            const container = document.getElementById('pile-container');
            if (!container) return;
            
            const div = document.createElement('div');
            const isRed = (c.suit === '♥' || c.suit === '♦');
            div.className = `card-base pile-card ${isRed ? 'red' : ''}`; 
            
            const spread = IS_TOUCH_DEVICE ? 16 : 24;
            const rot = IS_TOUCH_DEVICE ? 18 : 30;
            const x = Math.random() * spread - spread / 2;
            const y = Math.random() * spread - spread / 2;
            const r = Math.random() * rot - rot / 2; 
            
            div.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`;
            div.innerHTML = `
                <div class="card-corner">${c.value}<div>${c.suit}</div></div>
                <div class="card-center">${c.suit}</div>
                <div class="card-corner bottom">${c.value}<div>${c.suit}</div></div>`;
            
            container.appendChild(div);
            
            const cards = container.querySelectorAll('.pile-card');
            const maxPileVisuals = IS_TOUCH_DEVICE ? 10 : 15;
            if (cards.length > maxPileVisuals) {
                cards[0].remove();
            }
        }

        function distributePlayers(players, curName, isMyTurn) {
            const myIdx = players.findIndex(p => p.id === myId);
            if (myIdx === -1) return;
            
            const myInfo = document.getElementById('my-info-container');
            if (myInfo) {
                myInfo.innerHTML = `
                    <div class="panel player-info ${isMyTurn ? 'active' : ''}" style="z-index: 2000;">
                        ${isMyTurn ? '<div class="turn-indicator-dot"></div>' : ''}
                        <div style="font-weight:bold; font-size:18px;">${players[myIdx].name}</div>
                        ${players[myIdx].hats > 0 ? `<div style="margin-top:2px;">${"🎩".repeat(players[myIdx].hats)}</div>` : ''}
                    </div>`;
            }

            const others = players.slice(myIdx).concat(players.slice(0, myIdx)).slice(1);
            const slotIds = ['slot-left', 'slot-top', 'slot-right'];
            slotIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });

            others.forEach((p, i) => {
                const container = document.getElementById(slotIds[i]);
                if (!container) return;
                const active = p.name === curName;
                container.innerHTML = `
                    <div class="panel player-info ${active ? 'active' : ''}" style="opacity:${p.connected ? 1 : 0.4}; z-index: 2000;">
                        ${active ? '<div class="turn-indicator-dot"></div>' : ''}
                        <div style="font-weight:bold; font-size:18px;">${p.name}${p.connected ? '' : ' (Αποσ.)'}</div>
                        ${p.hats > 0 ? `<div style="margin-top:2px;">${"🎩".repeat(p.hats)}</div>` : ''}
                    </div>
                    <div class="opp-hand" style="width:${30 + (Math.min(p.handCount, 15) - 1) * 8}px">
                        ${Array(Math.min(p.handCount, 15)).fill(0).map((_, idx) => `<div class="mini-card" style="left:${idx * 8}px; z-index:${idx};"></div>`).join('')}
                    </div>
                    <div class="card-count-box">${p.handCount} φύλλα</div>`;
            });
        }

        function updateDirectionIndicator(playersArray, dir) {
            if (!playersArray || !playersArray.length) return;
            let names = playersArray.map(p => (p.name || "").replace('❤️', '').trim());
            
            let initials = names.map((name, i) => {
                let len = 1;
                let init = name.substring(0, len).toUpperCase();
                while (len <= name.length) {
                    let conflict = false;
                    for (let j = 0; j < names.length; j++) {
                        if (i !== j && names[j].toUpperCase().startsWith(init)) {
                            conflict = true; 
                            break;
                        }
                    }
                    if (!conflict) break;
                    len++;
                    init = name.substring(0, len).toUpperCase();
                }
                return init;
            });

            let counts = {};
            for (let i = 0; i < initials.length; i++) {
                let init = initials[i];
                if (counts[init]) {
                    counts[init]++;
                    initials[i] = init + counts[init];
                } else { 
                    counts[init] = 1; 
                }
            }

            document.getElementById('direction-indicator').innerText = dir === 1 ? initials.join(' ➔ ') : initials.join(' ⬅ ');
        }

        function renderScoreboard() {
            const table = document.getElementById('score-table');
            if (!table || !fullScoreHistory.length) return;

            const playersSource = (scoreboardPlayers && scoreboardPlayers.length)
                ? scoreboardPlayers
                : (window.currentScoreData?.players || []);

            if (!playersSource.length) return;

            const pKeys = [];
            const pMap = {};

            playersSource.forEach(p => {
                const key = p.sessionId || p.id;
                if (!pKeys.includes(key)) pKeys.push(key);
                pMap[key] = p;
                if (p.id) pMap[p.id] = p;
            });

            let html = `<tr>${
                pKeys.map(key => `<th>${pMap[key]?.name || 'Π'}${"🎩".repeat(pMap[key]?.hats || 0)}</th>`).join('')
            }</tr>`;

            const dataToShow = isScoreboardExpanded ? fullScoreHistory : fullScoreHistory.slice(-4);

            dataToShow.forEach(row => {
                html += '<tr>' + pKeys.map(key => {
                    let value = row[key];

                    if (value === undefined && pMap[key]?.id) {
                        value = row[pMap[key].id];
                    }

                    if (value === "WC") {
                        return '<td><b style="color:var(--gold)">WC</b></td>';
                    }

                    if (value === undefined || value === null) {
                        return '<td>-</td>';
                    }

                    return `<td>${value}</td>`;
                }).join('') + '</tr>';
            });

            table.innerHTML = html;
        }

        function toggleScoreboard() {
            const s = document.getElementById('scoreboard');
            s.style.display = s.style.display === 'block' ? 'none' : 'block';
        }

        function toggleChat() {
            const b = document.getElementById('chat-box');
            b.style.display = b.style.display === 'flex' ? 'none' : 'flex';
        }
        
        function sendChat() {
            const i = document.getElementById('chat-input');
            if (i.value) {
                socket.emit('chatMessage', i.value);
                i.value = '';
            }
        }
    </script>
</body>
</html>
