// Register GSAP plugins with safety checks
try {
    const plugins = [];
    if (typeof Draggable !== 'undefined') plugins.push(Draggable);
    if (typeof InertiaPlugin !== 'undefined') plugins.push(InertiaPlugin);
    if (typeof CustomEase !== 'undefined') plugins.push(CustomEase);
    if (typeof Flip !== 'undefined') plugins.push(Flip);
    gsap.registerPlugin(...plugins);
} catch (e) {
    console.error("GSAP Plugin registration failed:", e);
}

class PreloaderManager {
    constructor() {
        this.overlay = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.startTime = null;
        this.duration = 2000;
        this.createLoadingScreen();
    }

    createLoadingScreen() {
        this.overlay = document.getElementById("preloader-overlay");
        if (!this.overlay) return;

        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 100000;
            opacity: 1;
            transition: opacity 0.8s ease;
        `;

        this.canvas = document.createElement("canvas");
        this.canvas.width = 300;
        this.canvas.height = 300;

        this.ctx = this.canvas.getContext("2d");
        this.overlay.appendChild(this.canvas);

        this.startAnimation();

        // Fail-safe: Force hide preloader after 5 seconds no matter what
        setTimeout(() => this.complete(), 5000);
    }

    startAnimation() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        let time = 0;
        let lastTime = 0;

        const dotRings = [
            { radius: 20, count: 8 },
            { radius: 35, count: 12 },
            { radius: 50, count: 16 },
            { radius: 65, count: 20 },
            { radius: 80, count: 24 }
        ];

        const colors = {
            primary: "#00ff88",
            accent: "#00b8ff"
        };

        const hexToRgb = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
        };

        const animate = (timestamp) => {
            if (!this.startTime) this.startTime = timestamp;
            if (!lastTime) lastTime = timestamp;
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;
            time += deltaTime * 0.001;

            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                dotRings.forEach((ring, ringIndex) => {
                    for (let i = 0; i < ring.count; i++) {
                        const angle = (i / ring.count) * Math.PI * 2;
                        const radiusPulse = Math.sin(time * 2 - ringIndex * 0.4) * 3;
                        const x = centerX + Math.cos(angle) * (ring.radius + radiusPulse);
                        const y = centerY + Math.sin(angle) * (ring.radius + radiusPulse);

                        const opacityWave = 0.4 + Math.sin(time * 2 - ringIndex * 0.4 + i * 0.2) * 0.6;
                        const isActive = Math.sin(time * 2 - ringIndex * 0.4 + i * 0.2) > 0.6;

                        this.ctx.beginPath();
                        this.ctx.moveTo(centerX, centerY);
                        this.ctx.lineTo(x, y);
                        this.ctx.lineWidth = 0.8;

                        const rgb = isActive ? hexToRgb(colors.accent) : hexToRgb(colors.primary);
                        this.ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacityWave * 0.3})`;
                        this.ctx.stroke();

                        this.ctx.beginPath();
                        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
                        this.ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacityWave})`;
                        this.ctx.fill();
                    }
                });
            }

            if (timestamp - this.startTime >= this.duration) {
                this.complete();
                return;
            }
            this.animationId = requestAnimationFrame(animate);
        };
        this.animationId = requestAnimationFrame(animate);
    }

    complete(onComplete) {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.style.opacity = "0";
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.remove();
                    if (onComplete) onComplete();
                }
            }, 800);
        }
    }
}

class FashionGallery {
    constructor() {
        this.viewport = document.getElementById("viewport");
        this.canvasWrapper = document.getElementById("canvasWrapper");
        this.gridContainer = document.getElementById("gridContainer");
        this.splitScreenContainer = document.getElementById("splitScreenContainer");
        this.imageTitleOverlay = document.getElementById("imageTitleOverlay");
        this.closeButton = document.getElementById("closeButton");
        this.controlsContainer = document.getElementById("controlsContainer");
        this.soundToggle = document.getElementById("soundToggle");

        // Easing fallbacks
        try {
            this.customEase = typeof CustomEase !== 'undefined' ? CustomEase.create("smooth", ".87,0,.13,1") : "power2.inOut";
            this.centerEase = typeof CustomEase !== 'undefined' ? CustomEase.create("center", ".25,.46,.45,.94") : "power2.out";
        } catch (e) {
            this.customEase = "power2.inOut";
            this.centerEase = "power2.out";
        }

        this.config = {
            itemSize: 400,
            baseGap: 16,
            rows: 8,
            cols: 12,
            currentZoom: 0.2, // Default to Fit based on user request
            currentGap: 32
        };

        this.zoomState = {
            isActive: false,
            selectedItem: null,
            flipAnimation: null,
            scalingOverlay: null
        };

        this.gridItems = [];
        this.rotation = { x: 0, y: 0 }; // Store rotation state
        this.targetRotation = { x: 0, y: 0 };
        this.draggable = null;

        this.initImageData();
        this.initSoundSystem();
    }

    initImageData() {
        this.photoFiles = [
            'abstract_neon_reflection_1767496338137.jpg',
            'misty_mountain_sunrise_1767496351790.jpg',
            'desert_star_trail_1767496365558.jpg',
            'urban_architecture_geometric_1767496378917.jpg',
            'portrait_double_exposure_1767496392911.jpg',
            'minimalist_seascape_bw_1767496404933.jpg',
            'cyber_fashion_street_1767496420135.jpg',
            'action_surf_wave_1_1767332582416.jpg',
            'campfire_family_night_1_1767332237395.jpg',
            'child_candid_1_1767332127507.jpg',
            'city_senior_girl_1_1767332225436.jpg',
            'elderly_couple_1_1767332114822.jpg',
            'family_park_1_1767332027050.jpg',
            'forest_macro_moss_1_1767332553939.jpg',
            'frisbee_dog_action_1_1767332199881.jpg',
            'grad_portrait_1_1767332012896.jpg',
            'hands_newborn_baby_1_1767332211903.jpg',
            'holiday_family_1_1767332066305.jpg',
            'lifestyle_coffee_reading_1_1767332566757.jpg',
            'maternity_portrait_1_1767332140450.jpg',
            'modern_architecture_1_1767332523585.jpg',
            'night_sky_milky_way_1_1767332595500.jpg',
            'outdoor_wedding_1_1767332053250.jpg',
            'pet_portrait_1_1767332041047.jpg',
            'sports_portrait_1_1767332102198.jpg',
            'street_candid_rain_1_1767332535948.jpg',
            'studio_fashion_high_contrast_1_1767332609233.jpg',
            'sunset_beach_couple_1_1767332186704.jpg',
            'traveler_mountain_1_1767332080069.jpg'
        ];

        this.photoData = [
            { title: "NEON RAIN", desc: "Reflections of a cyberpunk city in the puddles of a rainy night." },
            { title: "MISTY DAWN", desc: "Golden sunlight piercing through the morning fog in the mountains." },
            { title: "COSMIC PATH", desc: "Star trails painting the sky above timeless desert rock formations." },
            { title: "GLASS PEAKS", desc: "Minimalist geometric patterns in modern glass architecture." },
            { title: "DREAMSTATE", desc: "Double exposure merging the human spirit with the serenity of nature." },
            { title: "SOLITUDE", desc: "Long exposure black and white seascape, finding peace in minimalism." },
            { title: "TECH WEAR", desc: "Futuristic fashion on the gritty streets of the metropolis." },
            { title: "WAVE RIDER", desc: "Capturing the raw energy of the Pacific barrel at golden hour." },
            { title: "NIGHT WATCH", desc: "Warmth of the fire against the silence of the Michigan wilderness." },
            { title: "JOY UNTAMED", desc: "The pure, unscripted laughter of childhood in a sunlit garden." },
            { title: "URBAN NEON", desc: "Cyberpunk aesthetics meeting the soul of the city at twilight." },
            { title: "LEGACY", desc: "A lifetime of stories etched into a single moment of quiet peace." },
            { title: "AUTUMN VIBES", desc: "Crisp leaves and warm hearts in the height of the fall season." },
            { title: "FOREST SOUL", desc: "Macro details of the life that thrives beneath the canopy." },
            { title: "AIRBORNE", desc: "Pure focus and athletic precision captured in mid-air." },
            { title: "NEW HORIZONS", desc: "The proud transition from student to architect of the future." },
            { title: "FRAGILITY", desc: "The profound bond of protection between generations." },
            { title: "YULETIDE", desc: "Matching sweaters and warm smiles against the winter chill." },
            { title: "SOLACE", desc: "A perfect morning of caffeine and contemplation." },
            { title: "ORIGINS", desc: "The ethereal beauty of new life waiting to begin." },
            { title: "STEEL SYMMETRY", desc: "Long exposure studies of futuristic architectural form." },
            { title: "CELESTIAL", desc: "Mapping the Milky Way above the silent mountain lakes." },
            { title: "THE VOW", desc: "Elegant commitment under the filtering forest light." },
            { title: "FAITHFUL", desc: "The unwavering gaze of man's best friend in the wildflowers." },
            { title: "GAME DAY", desc: "Intensity and grit under the stadium light haze." },
            { title: "RAIN SLICKED", desc: "Moody neon reflections in the heart of Tokyo's backstreets." },
            { title: "VOGUISH", desc: "High-contrast studio exploration of modern fashion form." },
            { title: "HORIZON", desc: "Silhouettes of companionship at the end of the day." },
            { title: "WANDERER", desc: "Solo exploration of the peaks above the cloud valley." }
        ];
    }

    initSoundSystem() {
        this.soundSystem = {
            enabled: false,
            sounds: {
                click: new Audio("https://assets.codepen.io/7558/glitch-fx-001.mp3"),
                open: new Audio("https://assets.codepen.io/7558/click-glitch-001.mp3"),
                close: new Audio("https://assets.codepen.io/7558/click-glitch-001.mp3"),
                bgm: new Audio("/assets/lofi-loop-1.mp3")
            },
            play: (name) => {
                if (this.soundSystem.enabled && this.soundSystem.sounds[name]) {
                    if (name !== 'bgm') {
                        this.soundSystem.sounds[name].currentTime = 0;
                        this.soundSystem.sounds[name].play().catch(() => { });
                    }
                }
            },
            toggle: () => {
                this.soundSystem.enabled = !this.soundSystem.enabled;
                this.soundToggle.classList.toggle("active", this.soundSystem.enabled);

                // Handle BGM
                if (this.soundSystem.enabled) {
                    this.soundSystem.sounds.bgm.loop = true;
                    this.soundSystem.sounds.bgm.volume = 0.3; // Lower volume for background
                    this.soundSystem.sounds.bgm.play().catch(e => console.log("Audio play failed:", e));
                } else {
                    this.soundSystem.sounds.bgm.pause();
                }
            }
        };

        // Force loop configuration immediately
        this.soundSystem.sounds.bgm.loop = true;
        this.soundSystem.sounds.bgm.volume = 0.3;

        // Add fallback event listener to ensure looping happens
        this.soundSystem.sounds.bgm.addEventListener('ended', function () {
            this.currentTime = 0;
            this.play().catch(e => console.log("Loop replay failed:", e));
        }, false);

        this.initSoundWave();
    }

    initSoundWave() {
        const canvas = document.getElementById("soundWaveCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, 32, 16);
            if (this.soundSystem.enabled) {
                ctx.fillStyle = "#00ff88";
                for (let i = 0; i < 32; i += 4) {
                    const h = 4 + Math.random() * 10;
                    ctx.fillRect(i, 8 - h / 2, 2, h);
                }
            } else {
                ctx.fillStyle = "#333";
                ctx.fillRect(0, 7, 32, 2);
            }
            requestAnimationFrame(animate);
        };
        animate();
    }

    initDemoModal() {
        const modal = document.getElementById("demo-modal");
        const closeBtn = document.getElementById("close-demo-modal");

        if (modal && closeBtn) {
            // Show modal after a short delay
            setTimeout(() => {
                modal.classList.add("active");
            }, 1000);

            closeBtn.onclick = () => {
                modal.classList.remove("active");
                // Optional: Store in session storage to not show again this session
                // sessionStorage.setItem("demoModalSeen", "true");
            };
        }
    }

    splitTextIntoLines(element, text) {
        element.innerHTML = "";
        const lines = text.split(". ").map(s => s.trim() + (s.endsWith('.') ? '' : '.'));
        lines.forEach(lineText => {
            const span = document.createElement("span");
            span.className = "description-line";
            span.textContent = lineText;
            element.appendChild(span);
        });
        return element.querySelectorAll(".description-line");
    }

    // Removed 2D grid helpers (calculateGapForZoom, calculateGridDimensions)
    // as they are no longer needed for the spherical layout.

    generateGridItems() {
        // Globe Settings
        const radius = 1200; // Radius of the sphere
        this.config.radius = radius;

        this.gridContainer.innerHTML = "";
        this.gridItems = [];

        const totalItems = 60; // Limit items for performance and cleaner look

        // fibonacci sphere algorithm for even distribution
        const goldenRatio = (1 + Math.sqrt(5)) / 2;

        for (let i = 0; i < totalItems; i++) {
            const item = document.createElement("div");
            item.className = "grid-item";

            // Calculate spherical coordinates
            const theta = 2 * Math.PI * i / goldenRatio;
            const phi = Math.acos(1 - 2 * (i + 0.5) / totalItems);

            // Convert to Cartesian (for verification or advanced math) if needed, 
            // but for CSS transforms we keep spherical logic or use translateZ.

            // We'll use CSS transforms: Rotate Y (Theta) -> Rotate X (Phi) -> Translate Z (Radius)
            // Adjusting rotation order to ensure items face center (or out)

            // Normalize angles for CSS
            const rotY = (theta * 180 / Math.PI);
            const rotX = (phi * 180 / Math.PI) - 90; // -90 to start from top/equator adjustment

            // Set initial position
            // 'transform' will be driven by GSAP, but we set the base placement here
            gsap.set(item, {
                rotationY: rotY,
                rotationX: rotX,
                z: radius,
                transformOrigin: "50% 50% -" + radius + "px", // Key for bending effect around center
                opacity: 0
            });

            const photoIdx = i % this.photoFiles.length;
            const img = document.createElement("img");
            img.src = `assets/photos/${this.photoFiles[photoIdx]}`;
            img.loading = "lazy";
            item.appendChild(img);

            const itemData = { element: item, img, index: photoIdx, rotY, rotX };
            item.onclick = () => this.enterZoomMode(itemData);

            this.gridContainer.appendChild(item);
            this.gridItems.push(itemData);
        }
    }

    initDraggable() {
        if (typeof Draggable === 'undefined') return;
        if (this.draggable) {
            if (Array.isArray(this.draggable)) this.draggable[0].kill();
            else this.draggable.kill();
        }

        // Create a proxy element to capture drag events without moving the actual container via CSS layout
        const proxy = document.createElement("div");
        document.body.appendChild(proxy);

        this.draggable = Draggable.create(proxy, {
            trigger: this.viewport,
            type: "x,y",
            inertia: true,
            onDrag: function () {
                // Determine delta map to rotation
                // x drag -> rotates Y axis
                // y drag -> rotates X axis
                const deltaX = this.x - this.startX;
                const deltaY = this.y - this.startY; // Map Y drag to X rotation

                // We'll just pass the velocity/movement to our rotate function
                // Actually, simpler to just track total rotation
            },
            onPress: () => {
                // Initialize drag start values if needed
            },
            onDrag: () => {
                const drag = this.draggable[0]; // get instance
                // dragging X pixels rotates Y degrees (adjust sensitivity)
                const sens = 0.2;
                const rotY = drag.x * sens;
                const rotX = -drag.y * sens; // Invert Y for natural feel

                gsap.set(this.gridContainer, {
                    rotationY: rotY,
                    rotationX: rotX
                });

                this.updateCoords(rotY, rotX);
            },
            onThrowUpdate: () => {
                const drag = this.draggable[0];
                const sens = 0.2;
                const rotY = drag.x * sens;
                const rotX = -drag.y * sens;

                gsap.set(this.gridContainer, {
                    rotationY: rotY,
                    rotationX: rotX
                });

                this.updateCoords(rotY, rotX);
            }
        });
    }

    updateCoords(ry, rx) {
        // Normalize coordinates to 360
        const y = Math.abs(ry % 360).toFixed(0);
        const x = Math.abs(rx % 360).toFixed(0);
        const display = document.getElementById("coord-display");
        if (display) display.textContent = `ROTATION: ${x}° X, ${y}° Y`;
    }

    enterZoomMode(itemData) {
        if (this.zoomState.isActive) return;
        this.zoomState.isActive = true;
        this.zoomState.selectedItem = itemData;

        this.soundSystem.play("open");
        document.body.classList.add("zoom-mode");
        this.splitScreenContainer.classList.add("active");

        const rect = itemData.element.getBoundingClientRect();
        const overlay = document.createElement("div");
        overlay.className = "scaling-image-overlay";
        overlay.innerHTML = `<img src="${itemData.img.src}">`;
        document.body.appendChild(overlay);
        this.zoomState.scalingOverlay = overlay;

        gsap.set(overlay, {
            left: rect.left, top: rect.top,
            width: rect.width, height: rect.height
        });

        const target = document.getElementById("zoomTarget");
        const targetRect = target.getBoundingClientRect();

        const tl = gsap.timeline();
        tl.to(this.splitScreenContainer, { opacity: 1, duration: 0.8 });
        tl.to(overlay, {
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
            duration: 1,
            ease: this.customEase
        }, 0);

        tl.add(() => {
            this.updateTitleOverlay(itemData.index);
            this.imageTitleOverlay.style.opacity = 1;
            this.closeButton.classList.add("active");
            this.controlsContainer.classList.add("split-mode");

            gsap.from(".description-line", { y: 20, opacity: 0, stagger: 0.1, duration: 0.5, clearProps: "all" });
            gsap.from(".image-slide-title h1", { y: 30, opacity: 0, duration: 0.6, clearProps: "all" });
            // Force visibility check
            this.updateTitleOverlay(itemData.index);
        });
    }

    exitZoomMode() {
        if (!this.zoomState.isActive) return;
        this.soundSystem.play("close");

        const rect = this.zoomState.selectedItem.element.getBoundingClientRect();

        const tl = gsap.timeline({
            onComplete: () => {
                if (this.zoomState.scalingOverlay) this.zoomState.scalingOverlay.remove();
                this.zoomState.isActive = false;
                document.body.classList.remove("zoom-mode");
                this.splitScreenContainer.classList.remove("active");
                this.imageTitleOverlay.style.opacity = 0;
            }
        });

        tl.to(this.imageTitleOverlay, { opacity: 0, duration: 0.3 });
        tl.to(this.zoomState.scalingOverlay, {
            left: rect.left, top: rect.top,
            width: rect.width, height: rect.height,
            duration: 0.8, ease: this.customEase
        }, 0);
        tl.to(this.splitScreenContainer, { opacity: 0, duration: 0.6 }, 0.2);

        this.closeButton.classList.remove("active");
        this.controlsContainer.classList.remove("split-mode");
    }

    updateTitleOverlay(idx) {
        const data = this.photoData[idx % this.photoData.length];
        const num = document.querySelector("#imageSlideNumber span");
        const tit = document.querySelector("#imageSlideTitle h1");
        if (num) num.textContent = (idx + 1).toString().padStart(2, '0');
        if (tit) {
            tit.textContent = data.title;
            tit.style.opacity = '1';
        }
        const descEl = document.getElementById("imageSlideDescription");
        this.splitTextIntoLines(descEl, data.desc);
        descEl.style.opacity = '1';
    }

    setZoom(zoom, btn) {
        this.config.currentZoom = zoom;
        document.querySelectorAll(".switch-button").forEach(b => b.classList.remove("switch-button-current"));
        if (btn) btn.classList.add("switch-button-current");

        // In 3D, 'Zoom' is just scaling the container or moving the camera.
        // We'll scale the canvas wrapper. 
        // Note: 1.0 = normal size

        gsap.to(this.canvasWrapper, {
            scale: zoom,
            duration: 1,
            ease: this.customEase
            // No need to reset draggable here as we aren't changing bounds
        });

        const indicator = document.getElementById("percentageIndicator");
        if (indicator) indicator.textContent = Math.round(zoom * 100) + "%";
    }

    init() {
        this.initDemoModal();
        this.generateGridItems();

        // Initialize 3D View
        // Apply initial zoom (0.2) immediately so it doesn't start zoomed in
        gsap.set(this.canvasWrapper, { scale: this.config.currentZoom });

        gsap.to(this.viewport, { opacity: 1, duration: 1 });

        // Stagger in elements from center
        gsap.to(".grid-item", {
            opacity: 1,
            scale: 1,
            duration: 1,
            stagger: {
                amount: 1,
                from: "random"
            },
            onComplete: () => {
                this.initDraggable();
                if (this.controlsContainer) this.controlsContainer.classList.add("visible");
                gsap.to(".header, .footer", { opacity: 1, duration: 1 });
            }
        });

        // Setup controls
        const zout = document.getElementById("zoom-out-btn");
        const norm = document.getElementById("normal-btn");
        const fit = document.getElementById("fit-btn");
        const cls = document.getElementById("closeButton");
        const snd = document.getElementById("soundToggle");

        // Initialize button states to match default zoom (0.2 / Fit)
        if (norm) norm.classList.remove("switch-button-current");
        if (fit) fit.classList.add("switch-button-current");

        if (zout) zout.onclick = (e) => this.setZoom(0.3, e.currentTarget);
        if (norm) norm.onclick = (e) => this.setZoom(0.6, e.currentTarget);
        // Zoom in removed as per user request (too close)
        if (fit) fit.onclick = (e) => this.setZoom(0.2, e.currentTarget);
        if (cls) cls.onclick = () => this.exitZoomMode();
        if (snd) snd.onclick = () => this.soundSystem.toggle();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const preloader = new PreloaderManager();
    // Start gallery init slightly after DOM is ready
    setTimeout(() => {
        const gallery = new FashionGallery();
        gallery.init();
    }, 500);
});
