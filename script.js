class PoolGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');        this.ctx = this.canvas.getContext('2d');
        this.powerElement = document.getElementById('power');
        this.resetButton = document.getElementById('reset-btn');
        this.pocketedBallsContainer = document.getElementById('pocketed-balls-container');
        
        // Oyun durumu
        this.currentPlayer = 1;
        this.gameOver = false;
        this.aiming = false;
        this.power = 0;
        this.maxPower = 150;
        this.pocketedBalls = []; // Deliğe sokulan toplar listesi
          // Fizik sabitleri
        this.friction = 0.98;
        this.minSpeed = 0.1;
        
        // Mobil dokunma hassasiyeti
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.touchSensitivity = this.isMobile ? 1.5 : 1; // Mobilde daha hassas
        
        // Mouse pozisyonu
        this.mouseX = 0;
        this.mouseY = 0;
        this.aimStartX = 0;
        this.aimStartY = 0;
          // Animasyon ve efekt sistemi (sarsıntı efekti tamamen kaldırıldı)
        this.particles = [];
        this.collisionEffects = [];
        this.holeEffects = [];
        this.ballTrails = new Map();
        this.powerPulse = 0;
        this.time = 0;

        // Arkaplan görseli yükle
        this.bgImage = new Image();
        this.bgImage.src = 'bg.jpg';
        this.bgImageLoaded = false;
        this.bgImage.onload = () => {
            this.bgImageLoaded = true;
        };        // Delikler (boylamasına masa için - duvar kenarlarıyla uyumlu)
        this.holes = [
            // Sol sıra: üst köşe, alt köşe
            { x: 35, y: 35, radius: 20 },
            { x: 35, y: 365, radius: 20 },
            // Üst ve alt kenarlar: orta
            { x: 350, y: 30, radius: 20 },
            { x: 350, y: 370, radius: 20 },
            // Sağ sıra: üst köşe, alt köşe
            { x: 665, y: 35, radius: 20 },
            { x: 665, y: 365, radius: 20 }
        ];
        
        this.initializeBalls();
        this.bindEvents();
        this.gameLoop();
    }
    
    initializeBalls() {
        this.balls = [];
          // Beyaz top (oyuncu topu) - boylamasına masada sol tarafta
        this.cueBall = {
            x: 175,
            y: 200,
            vx: 0,
            vy: 0,
            radius: 12,
            color: '#ffffff',
            type: 'cue',
            inHole: false,
            rotation: 0 // Yuvarlanma açısı
        };
        this.balls.push(this.cueBall);
        
        // Renkli toplar (15 adet) - doğru bilardo renkleri
        const ballData = [
            // Solid toplar (1-7)
            { color: '#ffff00', type: 'solid', number: 1 }, // Sarı
            { color: '#0000ff', type: 'solid', number: 2 }, // Mavi
            { color: '#ff0000', type: 'solid', number: 3 }, // Kırmızı
            { color: '#800080', type: 'solid', number: 4 }, // Mor
            { color: '#ffa500', type: 'solid', number: 5 }, // Turuncu
            { color: '#008000', type: 'solid', number: 6 }, // Yeşil
            { color: '#800000', type: 'solid', number: 7 }, // Bordo
            // 8 topu (siyah)
            { color: '#000000', type: 'eight', number: 8 },
            // Striped toplar (9-15)
            { color: '#ffff00', type: 'striped', number: 9 },  // Sarı çizgili
            { color: '#0000ff', type: 'striped', number: 10 }, // Mavi çizgili
            { color: '#ff0000', type: 'striped', number: 11 }, // Kırmızı çizgili
            { color: '#800080', type: 'striped', number: 12 }, // Mor çizgili
            { color: '#ffa500', type: 'striped', number: 13 }, // Turuncu çizgili
            { color: '#008000', type: 'striped', number: 14 }, // Yeşil çizgili
            { color: '#800000', type: 'striped', number: 15 }  // Bordo çizgili
        ];
          // Üçgen dizilim - boylamasına masada sağ tarafta (beyaz toptan sağa doğru artan)
        let ballIndex = 0;
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col <= row; col++) {
                const x = 480 + row * 14;
                const y = 200 - (row * 12) + (col * 24);
                const ballInfo = ballData[ballIndex];
                
                this.balls.push({
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0,
                    radius: 12,
                    color: ballInfo.color,
                    type: ballInfo.type,
                    number: ballInfo.number,
                    inHole: false,
                    rotation: 0 // Yuvarlanma açısı
                });
                ballIndex++;
            }
        }
    }
      bindEvents() {
        // Mouse olayları
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        // Touch olayları (mobil için)
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
        });
        
        // Masa dışında da mouse/touch takibi için window eventi ekle
        window.addEventListener('mousemove', (e) => {
            if (this.aiming) {
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = e.clientX - rect.left;
                this.mouseY = e.clientY - rect.top;
            }
        });
        
        window.addEventListener('touchmove', (e) => {
            if (this.aiming) {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const touch = e.touches[0];
                this.mouseX = touch.clientX - rect.left;
                this.mouseY = touch.clientY - rect.top;
            }
        });
        
        // Mouse down/touch start olayları
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameOver || this.ballsMoving()) return;
            
            this.aiming = true;
            this.aimStartX = this.mouseX;
            this.aimStartY = this.mouseY;
            this.power = 0;
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameOver || this.ballsMoving()) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
            
            this.aiming = true;
            this.aimStartX = this.mouseX;
            this.aimStartY = this.mouseY;
            this.power = 0;
        });
        
        // Mouse up/touch end olayları
        window.addEventListener('mouseup', (e) => {
            if (this.aiming && !this.ballsMoving()) {
                this.shootCueBall();
                this.aiming = false;
                this.power = 0;
            }
        });
        
        window.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.aiming && !this.ballsMoving()) {
                this.shootCueBall();
                this.aiming = false;
                this.power = 0;
            }
        });
        
        this.resetButton.addEventListener('click', () => {
            this.resetGame();
        });
    }
    
    ballsMoving() {
        return this.balls.some(ball => 
            !ball.inHole && (Math.abs(ball.vx) > this.minSpeed || Math.abs(ball.vy) > this.minSpeed)
        );
    }
    
    shootCueBall() {
        if (this.cueBall.inHole) return;
        
        // Tersine çekme mekanizması - farenin beyaz toptan uzaklığına göre
        const dx = this.cueBall.x - this.mouseX; // Ters yön
        const dy = this.cueBall.y - this.mouseY; // Ters yön
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const force = this.power / 100 * 15;
            this.cueBall.vx = (dx / distance) * force;
            this.cueBall.vy = (dy / distance) * force;
        }
    }
    
    update() {        if (this.aiming && !this.ballsMoving()) {
            const dx = this.cueBall.x - this.mouseX; // Ters yön için
            const dy = this.cueBall.y - this.mouseY; // Ters yön için
            const distance = Math.sqrt(dx * dx + dy * dy);
            // Mobilde daha hassas güç kontrolü
            const powerMultiplier = this.isMobile ? this.touchSensitivity : 1;
            this.power = Math.min(distance / 2 * powerMultiplier, this.maxPower);
            this.powerElement.textContent = `Güç: ${Math.round(this.power)}%`;
        }
        
        // Topları güncelle
        this.balls.forEach(ball => {
            if (ball.inHole) return;
            
            // Pozisyonu güncelle
            ball.x += ball.vx;
            ball.y += ball.vy;
            
            // Gelişmiş yuvarlanma efekti - topun hızına ve yönüne göre döndür
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (speed > 0.1) {
                // Hareket yönüne göre dönme - gerçekçi yuvarlanma
                const rotationSpeed = speed * 0.08; // Dönme hızı topun boyutuna göre ayarlandı
                ball.rotation += rotationSpeed;
                
                // 2π'ye ulaştığında sıfırla (döngüsel)
                if (ball.rotation >= Math.PI * 2) {
                    ball.rotation -= Math.PI * 2;
                }
            }
            
            // Sürtünme
            ball.vx *= this.friction;
            ball.vy *= this.friction;
            
            // Minimum hız kontrolü
            if (Math.abs(ball.vx) < this.minSpeed) ball.vx = 0;
            if (Math.abs(ball.vy) < this.minSpeed) ball.vy = 0;            // Duvar çarpışmaları (daha dar masa için)
            const playAreaLeft = 30;
            const playAreaRight = this.canvas.width - 30;
            const playAreaTop = 35;
            const playAreaBottom = this.canvas.height - 35;
            
            // Sol ve sağ duvar çarpışması
            if (ball.x - ball.radius <= playAreaLeft || ball.x + ball.radius >= playAreaRight) {
                ball.vx = -ball.vx;
                ball.x = Math.max(playAreaLeft + ball.radius, Math.min(playAreaRight - ball.radius, ball.x));
                // Duvar çarpışma efekti (sarsıntı kaldırıldı)
                this.createCollisionEffect(ball.x, ball.y, Math.abs(ball.vx));
            }
            
            // Üst ve alt duvar çarpışması
            if (ball.y - ball.radius <= playAreaTop || ball.y + ball.radius >= playAreaBottom) {
                ball.vy = -ball.vy;
                ball.y = Math.max(playAreaTop + ball.radius, Math.min(playAreaBottom - ball.radius, ball.y));
                // Duvar çarpışma efekti (sarsıntı kaldırıldı)
                this.createCollisionEffect(ball.x, ball.y, Math.abs(ball.vy));
            }
        });
        
        // Top çarpışmaları
        this.checkBallCollisions();
        
        // Delik kontrolü
        this.checkHoles();
        
        // Animasyonları güncelle
        this.updateAnimations();
        
        // Oyun bitişi kontrolü
        this.checkGameEnd();
    }
    
    checkBallCollisions() {
        for (let i = 0; i < this.balls.length; i++) {
            for (let j = i + 1; j < this.balls.length; j++) {
                const ball1 = this.balls[i];
                const ball2 = this.balls[j];
                
                if (ball1.inHole || ball2.inHole) continue;
                
                const dx = ball2.x - ball1.x;
                const dy = ball2.y - ball1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < ball1.radius + ball2.radius) {
                    // Çarpışma efekti ekle (sarsıntı kaldırıldı)
                    this.createCollisionEffect(
                        (ball1.x + ball2.x) / 2,
                        (ball1.y + ball2.y) / 2,
                        Math.sqrt(ball1.vx * ball1.vx + ball1.vy * ball1.vy)
                    );
                    
                    // Çarpışma hesaplaması
                    const angle = Math.atan2(dy, dx);
                    const sin = Math.sin(angle);
                    const cos = Math.cos(angle);
                    
                    // Hızları döndür
                    const vx1 = ball1.vx * cos + ball1.vy * sin;
                    const vy1 = ball1.vy * cos - ball1.vx * sin;
                    const vx2 = ball2.vx * cos + ball2.vy * sin;
                    const vy2 = ball2.vy * cos - ball2.vx * sin;
                    
                    // Çarpışma sonrası hızlar
                    const vx1Final = vx2;
                    const vx2Final = vx1;
                    
                    // Hızları geri döndür
                    ball1.vx = vx1Final * cos - vy1 * sin;
                    ball1.vy = vy1 * cos + vx1Final * sin;
                    ball2.vx = vx2Final * cos - vy2 * sin;
                    ball2.vy = vy2 * cos + vx2Final * sin;
                    
                    // Topları ayır
                    const overlap = ball1.radius + ball2.radius - distance;
                    ball1.x -= overlap * 0.5 * cos;
                    ball1.y -= overlap * 0.5 * sin;
                    ball2.x += overlap * 0.5 * cos;
                    ball2.y += overlap * 0.5 * sin;
                }
            }
        }
    }
    
    checkHoles() {
        this.balls.forEach(ball => {
            if (ball.inHole) return;
            
            this.holes.forEach(hole => {
                const dx = ball.x - hole.x;
                const dy = ball.y - hole.y;
                const distance = Math.sqrt(dx * dx + dy * dy);                  // Delik toleransı - daha dar tolerans (daha merkezde olmak gerekir)
                if (distance < hole.radius + ball.radius / 6) {
                    // Delik efekti ekle (sarsıntı kaldırıldı)
                    this.createHoleEffect(hole.x, hole.y, ball.color);
                    
                    ball.inHole = true;
                    ball.vx = 0;
                    ball.vy = 0;
                    
                    // Top deliğe girme animasyonu
                    this.animateBallToHole(ball, hole);
                    
                    // Beyaz top değilse deliğe sokulan toplar listesine ekle
                    if (ball !== this.cueBall) {
                        this.addToPocketedBalls(ball);
                    }
                    
                    if (ball === this.cueBall) {                        // Beyaz top deliğe düştü - boylamasına masada sol tarafa yerleştir
                        setTimeout(() => {
                            ball.inHole = false;
                            ball.x = 175;
                            ball.y = 200;
                            ball.rotation = 0; // Rotation'ı sıfırla
                            // Beyaz top geri gelme efekti
                            this.createSpawnEffect(175, 200);
                        }, 1000);
                    }
                }
            });
        });
    }
    
    checkGameEnd() {
        const coloredBalls = this.balls.filter(ball => ball.type === 'solid' && !ball.inHole);
        const eightBall = this.balls.find(ball => ball.type === 'eight');
          if (coloredBalls.length === 0 && eightBall && eightBall.inHole) {
            this.gameOver = true;
            console.log('🎉 Oyun Bitti! Tebrikler!');
        }
    }
    
    // Animasyon ve efekt fonksiyonları (sarsıntı efektleri kaldırıldı)
    createCollisionEffect(x, y, intensity) {
        const particleCount = Math.min(8, Math.max(3, intensity * 2));
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * intensity * 2,
                vy: (Math.random() - 0.5) * intensity * 2,
                life: 1.0,
                maxLife: 30 + Math.random() * 20,
                size: 2 + Math.random() * 3,
                color: `hsl(${Math.random() * 60 + 20}, 70%, 50%)`
            });
        }
        
        this.collisionEffects.push({
            x: x,
            y: y,
            life: 1.0,
            maxLife: 20,
            size: intensity * 5
        });
    }
    
    createHoleEffect(x, y, ballColor) {
        // Spiral efekti
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            this.particles.push({
                x: x + Math.cos(angle) * 15,
                y: y + Math.sin(angle) * 15,
                vx: Math.cos(angle) * -2,
                vy: Math.sin(angle) * -2,
                life: 1.0,
                maxLife: 40,
                size: 3,
                color: ballColor
            });
        }
        
        this.holeEffects.push({
            x: x,
            y: y,
            life: 1.0,
            maxLife: 30,
            size: 40
        });
    }
    
    createSpawnEffect(x, y) {
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 1.0,
                maxLife: 25,
                size: 2,
                color: '#ffffff'
            });
        }
    }
    
    animateBallToHole(ball, hole) {
        // Top küçülme animasyonu
        const originalRadius = ball.radius;
        let shrinkTime = 0;
        const shrinkDuration = 15;
        
        const shrinkAnimation = () => {
            shrinkTime++;
            ball.radius = originalRadius * (1 - shrinkTime / shrinkDuration);
            ball.x += (hole.x - ball.x) * 0.1;
            ball.y += (hole.y - ball.y) * 0.1;
            
            if (shrinkTime < shrinkDuration) {
                requestAnimationFrame(shrinkAnimation);
            } else {
                ball.radius = originalRadius;
            }
        };
        
        requestAnimationFrame(shrinkAnimation);
    }
    
    updateAnimations() {
        this.time++;
        
        // Güç nabzı animasyonu
        this.powerPulse = Math.sin(this.time * 0.2) * 0.5 + 0.5;
        
        // Partikülleri güncelle
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            particle.life -= 1 / particle.maxLife;
            return particle.life > 0;
        });
        
        // Çarpışma efektlerini güncelle
        this.collisionEffects = this.collisionEffects.filter(effect => {
            effect.life -= 1 / effect.maxLife;
            return effect.life > 0;
        });
        
        // Delik efektlerini güncelle
        this.holeEffects = this.holeEffects.filter(effect => {
            effect.life -= 1 / effect.maxLife;
            return effect.life > 0;
        });
        
        // Top izlerini güncelle
        this.balls.forEach(ball => {
            if (!ball.inHole && (Math.abs(ball.vx) > 0.5 || Math.abs(ball.vy) > 0.5)) {
                if (!this.ballTrails.has(ball)) {
                    this.ballTrails.set(ball, []);
                }
                const trail = this.ballTrails.get(ball);
                trail.push({ x: ball.x, y: ball.y, life: 1.0 });
                if (trail.length > 8) trail.shift();
                
                // İz parçacıklarını güncelle
                trail.forEach(point => {
                    point.life -= 0.15;
                });
                this.ballTrails.set(ball, trail.filter(point => point.life > 0));
            } else {
                this.ballTrails.delete(ball);
            }
        });
    }
    
    // Renk yardımcı fonksiyonları
    lightenColor(color, percent) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const newR = Math.min(255, Math.floor(r + (255 - r) * percent / 100));
        const newG = Math.min(255, Math.floor(g + (255 - g) * percent / 100));
        const newB = Math.min(255, Math.floor(b + (255 - b) * percent / 100));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
    }
    
    darkenColor(color, percent) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const newR = Math.max(0, Math.floor(r * (1 - percent / 100)));
        const newG = Math.max(0, Math.floor(g * (1 - percent / 100)));
        const newB = Math.max(0, Math.floor(b * (1 - percent / 100)));
        
        return `rgb(${newR}, ${newG}, ${newB})`;    }      draw() {
        // Canvas'ı saydam olarak temizle
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Delikleri ÖNCE çiz (arkaplan resminin altında kalacak)
        this.holes.forEach(hole => {
            // Delik gölgesi
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(hole.x + 1, hole.y + 1, hole.radius + 1, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Ana delik
            this.ctx.fillStyle = '#1a1a1a';
            this.ctx.beginPath();
            this.ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
          // Arkaplan görseli çiz (bg.jpg) - deliklerin ÜZERİNE
        if (this.bgImageLoaded) {
            // Görsel canvas boyutuna sığacak şekilde çiz
            this.ctx.drawImage(this.bgImage, 0, 0, this.canvas.width, this.canvas.height);
        }
        // Resim yüklenene kadar hiçbir arkaplan çizme (saydam kalır)
        
        // Top izlerini çiz
        this.ballTrails.forEach((trail, ball) => {
            if (trail.length > 1) {
                this.ctx.strokeStyle = ball.color;
                this.ctx.lineWidth = 3;
                this.ctx.lineCap = 'round';
                for (let i = 1; i < trail.length; i++) {
                    this.ctx.globalAlpha = trail[i].life * 0.3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(trail[i-1].x, trail[i-1].y);
                    this.ctx.lineTo(trail[i].x, trail[i].y);
                    this.ctx.stroke();
                }
                this.ctx.globalAlpha = 1;
            }
        });
        
        // Topları çiz (3D efektli ve gelişmiş yuvarlanma efekti)
        this.balls.forEach(ball => {
            if (ball.inHole) return;
            
            // Top gölgesi
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Ana top
            const ballGradient = this.ctx.createRadialGradient(
                ball.x - ball.radius / 3, ball.y - ball.radius / 3, 0,
                ball.x, ball.y, ball.radius
            );
            ballGradient.addColorStop(0, this.lightenColor(ball.color, 40));
            ballGradient.addColorStop(0.7, ball.color);
            ballGradient.addColorStop(1, this.darkenColor(ball.color, 30));
            
            this.ctx.fillStyle = ballGradient;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Top parlama efekti
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(ball.x - ball.radius / 4, ball.y - ball.radius / 4, ball.radius / 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Top kenarı
            this.ctx.strokeStyle = this.darkenColor(ball.color, 50);
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Sayı ve çizgiler (geliştirilmiş yuvarlanma efektli)
            if (ball.type !== 'cue' && ball.number) {
                // Yuvarlanma efekti için context'i kaydet ve döndür
                this.ctx.save();
                this.ctx.translate(ball.x, ball.y);
                this.ctx.rotate(ball.rotation);
                this.ctx.translate(-ball.x, -ball.y);
                  if (ball.type === 'striped') {
                    // Çizgili toplar için tek beyaz çizgi (yatay) - yuvarlanma ile döner
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 12;
                    this.ctx.lineCap = 'round';
                    
                    // Tek yatay çizgi çiz (döner)
                    this.ctx.beginPath();
                    this.ctx.moveTo(ball.x - ball.radius + 6, ball.y);
                    this.ctx.lineTo(ball.x + ball.radius - 6, ball.y);
                    this.ctx.stroke();
                    
                    // Sayı arka planı (beyaz daire - çizgili toplar için)
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.beginPath();
                    this.ctx.arc(ball.x, ball.y, ball.radius * 0.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Sayı metni (çizgili toplar için)
                    this.ctx.fillStyle = '#000000';
                    this.ctx.font = 'bold 8px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(ball.number, ball.x, ball.y + 2);
                } else {
                    // Solid toplar için sayı arka planı (beyaz daire) - rotation ile döner
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.beginPath();
                    this.ctx.arc(ball.x, ball.y, ball.radius * 0.6, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Top üzerinde dönen işaret (küçük nokta)
                    this.ctx.fillStyle = this.darkenColor(ball.color, 60);
                    this.ctx.beginPath();
                    this.ctx.arc(ball.x, ball.y - ball.radius * 0.7, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Sayı metni (solid toplar için)
                    this.ctx.fillStyle = '#000000';
                    this.ctx.font = 'bold 9px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(ball.number, ball.x, ball.y + 3);
                }
                
                // Context'i geri yükle
                this.ctx.restore();
            }
        });
        
        // Partikülleri çiz
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
        
        // Çarpışma efektlerini çiz
        this.collisionEffects.forEach(effect => {
            this.ctx.globalAlpha = effect.life * 0.5;
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.size * (1 - effect.life), 0, Math.PI * 2);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1;
        
        // Delik efektlerini çiz
        this.holeEffects.forEach(effect => {
            this.ctx.globalAlpha = effect.life * 0.3;
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.size * (1 - effect.life), 0, Math.PI * 2);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1;
        
        // Nişan çizgisi (ters yönde) - geliştirilmiş görsel geri bildirim
        if (this.aiming && !this.cueBall.inHole && !this.ballsMoving()) {
            // Topun gideceği yön hesaplama
            const dx = this.cueBall.x - this.mouseX;
            const dy = this.cueBall.y - this.mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) { // Minimum mesafe kontrolü
                // Normalize et
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                // İlk çarpacağı topu bul
                const targetBall = this.findFirstCollisionBall(normalizedX, normalizedY);
                  // Topun gideceği yönü göster (uzun beyaz çizgi)
                let aimLength = Math.min(200, distance * 2);
                if (targetBall) {
                    // Eğer hedef top varsa, ona kadar çiz
                    const distanceToTarget = Math.sqrt(
                        (targetBall.x - this.cueBall.x) ** 2 + 
                        (targetBall.y - this.cueBall.y) ** 2
                    ) - targetBall.radius - this.cueBall.radius;
                    aimLength = Math.min(aimLength, distanceToTarget);
                }
                
                const aimX = this.cueBall.x + normalizedX * aimLength;
                const aimY = this.cueBall.y + normalizedY * aimLength;
                
                // Mobilde daha kalın çizgiler
                const lineWidth = this.isMobile ? 5 : 3;
                const dashPattern = this.isMobile ? [12, 6] : [8, 4];
                
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = lineWidth;
                this.ctx.setLineDash(dashPattern);
                this.ctx.beginPath();
                this.ctx.moveTo(this.cueBall.x, this.cueBall.y);
                this.ctx.lineTo(aimX, aimY);
                this.ctx.stroke();
                
                // Ok işareti ekle (topun gideceği yön) - mobilde daha büyük
                const arrowSize = this.isMobile ? 20 : 15;
                const arrowX = this.cueBall.x + normalizedX * (this.isMobile ? 40 : 30);
                const arrowY = this.cueBall.y + normalizedY * (this.isMobile ? 40 : 30);
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.moveTo(arrowX, arrowY);
                this.ctx.lineTo(arrowX - normalizedX * arrowSize - normalizedY * arrowSize/2, 
                               arrowY - normalizedY * arrowSize + normalizedX * arrowSize/2);
                this.ctx.lineTo(arrowX - normalizedX * arrowSize + normalizedY * arrowSize/2, 
                               arrowY - normalizedY * arrowSize - normalizedX * arrowSize/2);
                this.ctx.closePath();
                this.ctx.fill();
                
                this.ctx.setLineDash([]);
                
                // Hedef topun gideceği yönü göster
                if (targetBall) {
                    // Çarpışma sonrası hedef topun yönü
                    const targetDirection = this.calculateTargetBallDirection(normalizedX, normalizedY, targetBall);
                    
                    // Sadece hedef top gerçekten hareket edecekse göster
                    const directionMagnitude = Math.sqrt(targetDirection.x * targetDirection.x + targetDirection.y * targetDirection.y);
                    if (directionMagnitude > 0.1) {                        // Hedef topun gideceği yolu göster (turuncu çizgi)
                        const targetAimLength = this.isMobile ? 150 : 120;
                        const targetAimX = targetBall.x + targetDirection.x * targetAimLength;
                        const targetAimY = targetBall.y + targetDirection.y * targetAimLength;
                        
                        this.ctx.strokeStyle = '#ff8c00';
                        this.ctx.lineWidth = lineWidth;
                        this.ctx.setLineDash([7, 7]);
                        this.ctx.beginPath();
                        this.ctx.moveTo(targetBall.x, targetBall.y);
                        this.ctx.lineTo(targetAimX, targetAimY);
                        this.ctx.stroke();
                        
                        // Hedef top için ok işareti - mobilde daha büyük
                        const targetArrowSize = this.isMobile ? 18 : 15;
                        const targetArrowX = targetBall.x + targetDirection.x * (this.isMobile ? 45 : 35);
                        const targetArrowY = targetBall.y + targetDirection.y * (this.isMobile ? 45 : 35);
                        
                        this.ctx.fillStyle = '#ff8c00';
                        this.ctx.beginPath();
                        this.ctx.moveTo(targetArrowX, targetArrowY);
                        this.ctx.lineTo(targetArrowX - targetDirection.x * targetArrowSize - targetDirection.y * targetArrowSize/2, 
                                       targetArrowY - targetDirection.y * targetArrowSize + targetDirection.x * targetArrowSize/2);
                        this.ctx.lineTo(targetArrowX - targetDirection.x * targetArrowSize + targetDirection.y * targetArrowSize/2, 
                                       targetArrowY - targetDirection.y * targetArrowSize - targetDirection.x * targetArrowSize/2);
                        this.ctx.closePath();
                        this.ctx.fill();
                    }
                      // Hedef topu vurgula - mobilde daha kalın
                    this.ctx.strokeStyle = '#ff8c00';
                    this.ctx.lineWidth = this.isMobile ? 5 : 3;
                    this.ctx.setLineDash([]);
                    this.ctx.beginPath();
                    this.ctx.arc(targetBall.x, targetBall.y, targetBall.radius + (this.isMobile ? 6 : 4), 0, Math.PI * 2);
                    this.ctx.stroke();
                    
                    // Mobilde ek vurgulama halkası
                    if (this.isMobile) {
                        this.ctx.strokeStyle = 'rgba(255, 140, 0, 0.5)';
                        this.ctx.lineWidth = 2;
                        this.ctx.beginPath();
                        this.ctx.arc(targetBall.x, targetBall.y, targetBall.radius + 10, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                    
                    this.ctx.setLineDash([]);
                }                // Çektiğiniz yönü göster (ince sarı çizgi)
                this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
                this.ctx.lineWidth = this.isMobile ? 3 : 2;
                this.ctx.setLineDash([6, 6]);
                this.ctx.beginPath();
                this.ctx.moveTo(this.cueBall.x, this.cueBall.y);
                this.ctx.lineTo(this.mouseX, this.mouseY);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                
                // Güç yüzdesi metni - mobilde daha büyük
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = this.isMobile ? '16px Arial' : '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = this.isMobile ? 3 : 2;
                this.ctx.strokeText(`${Math.round(this.power)}%`, this.cueBall.x, this.cueBall.y - (this.isMobile ? 35 : 25));
                this.ctx.fillText(`${Math.round(this.power)}%`, this.cueBall.x, this.cueBall.y - (this.isMobile ? 35 : 25));
            }
        }
    }
    
    // İlk çarpacağı topu bul - geliştirilmiş ray-casting ile
    findFirstCollisionBall(directionX, directionY) {
        let closestBall = null;
        let closestDistance = Infinity;
        
        // Ray-casting yöntemi ile hassas çarpışma kontrolü
        const maxRayDistance = 800; // Maksimum ışın uzunluğu
        const stepSize = 1; // Kontrol adımı (hassasiyet için küçük)
        
        // Beyaz topun başlangıç pozisyonu
        let rayX = this.cueBall.x;
        let rayY = this.cueBall.y;
        
        // Işın boyunca ilerle
        for (let distance = stepSize; distance < maxRayDistance; distance += stepSize) {
            rayX = this.cueBall.x + directionX * distance;
            rayY = this.cueBall.y + directionY * distance;
              // Duvar kontrolü - eğer duvara çarparsa dur
            if (rayX <= 30 + this.cueBall.radius || rayX >= this.canvas.width - 30 - this.cueBall.radius || 
                rayY <= 30 + this.cueBall.radius || rayY >= this.canvas.height - 30 - this.cueBall.radius) {
                break;
            }
            
            // Her top için çarpışma kontrolü
            for (let ball of this.balls) {
                if (ball === this.cueBall || ball.inHole) continue;
                
                // Ray pozisyonundan topa olan mesafe
                const dx = rayX - ball.x;
                const dy = rayY - ball.y;
                const distanceToBall = Math.sqrt(dx * dx + dy * dy);
                
                // Çarpışma kontrolü (topların çapları toplamı)
                if (distanceToBall <= this.cueBall.radius + ball.radius) {
                    // Bu en yakın top mu?
                    const actualDistanceFromCue = Math.sqrt(
                        (ball.x - this.cueBall.x) ** 2 + 
                        (ball.y - this.cueBall.y) ** 2
                    );
                    
                    if (actualDistanceFromCue < closestDistance) {
                        closestBall = ball;
                        closestDistance = actualDistanceFromCue;
                    }
                    
                    // İlk çarpışmayı bulduk, döngüden çık
                    return closestBall;
                }
            }
        }
        
        return closestBall;
    }
    
    // Hedef topun çarpışma sonrası yönünü hesapla (gerçek çarpışma açısı)
    calculateTargetBallDirection(cueBallDirX, cueBallDirY, targetBall) {
        // Beyaz topun normalize edilmiş hız vektörü
        const velX = cueBallDirX;
        const velY = cueBallDirY;
        
        // Topların merkez mesafesi
        const toBallX = targetBall.x - this.cueBall.x;
        const toBallY = targetBall.y - this.cueBall.y;
        const distance = Math.sqrt(toBallX * toBallX + toBallY * toBallY);
        
        if (distance < 0.1) return { x: 0, y: 0 };
        
        // Çarpışma anında beyaz topun merkezi hangi noktada olacak?
        // Bu, çarpışma açısını belirler
        const collisionDistance = distance - this.cueBall.radius - targetBall.radius;
        const cueBallAtCollisionX = this.cueBall.x + velX * collisionDistance;
        const cueBallAtCollisionY = this.cueBall.y + velY * collisionDistance;
        
        // Çarpışma anında topların merkezleri arasındaki vektör
        const collisionNormalX = targetBall.x - cueBallAtCollisionX;
        const collisionNormalY = targetBall.y - cueBallAtCollisionY;
        const normalLength = Math.sqrt(collisionNormalX * collisionNormalX + collisionNormalY * collisionNormalY);
        
        if (normalLength < 0.1) return { x: 0, y: 0 };
        
        // Normalize edilmiş çarpışma normal vektörü
        const normalX = collisionNormalX / normalLength;
        const normalY = collisionNormalY / normalLength;
        
        // Beyaz topun hızının çarpışma normal doğrultusundaki bileşeni
        const normalComponent = velX * normalX + velY * normalY;
        
        // Eğer beyaz top hedef topa doğru gelmiyor ise, çarpışma olmaz
        if (normalComponent <= 0) return { x: 0, y: 0 };
        
        // Hedef top bu normal doğrultusunda hareket eder
        return {
            x: normalX,
            y: normalY
        };    }
    
    // Deliğe sokulan topları yönet
    addToPocketedBalls(ball) {
        this.pocketedBalls.push({
            color: ball.color,
            number: ball.number,
            type: ball.type
        });
        this.updatePocketedBallsDisplay();
    }
    
    updatePocketedBallsDisplay() {
        const container = this.pocketedBallsContainer;
        container.innerHTML = '';
        
        if (this.pocketedBalls.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-message';
            emptyMsg.textContent = 'Henüz deliğe sokulan top yok';
            container.appendChild(emptyMsg);
            return;
        }
          this.pocketedBalls.forEach(ball => {
            const ballElement = document.createElement('div');
            ballElement.className = 'pocketed-ball';
            if (ball.type === 'striped') {
                ballElement.classList.add('striped');
                // Çizgili toplar için sayıyı data attribute olarak ayarla
                ballElement.setAttribute('data-number', ball.number);
            }
            
            // CSS değişkeni olarak top rengini ayarla
            ballElement.style.setProperty('--ball-color', ball.color);
            
            // Top numarasını ekle (sadece çizgili olmayan toplar için)
            if (ball.number && ball.type !== 'striped') {
                ballElement.textContent = ball.number;
            }
            
            container.appendChild(ballElement);
        });
    }      resetGame() {
        this.currentPlayer = 1;
        this.gameOver = false;
        this.aiming = false;
        this.power = 0;
        this.powerElement.textContent = 'Güç: 0%';
        
        // Animasyon sistemlerini sıfırla
        this.particles = [];
        this.collisionEffects = [];
        this.holeEffects = [];
        this.ballTrails.clear();
        
        // Deliğe sokulan topları sıfırla
        this.pocketedBalls = [];
        this.updatePocketedBallsDisplay();
        
        this.initializeBalls();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Oyunu başlat
document.addEventListener('DOMContentLoaded', () => {
    new PoolGame();
});
