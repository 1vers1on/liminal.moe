<script>
    import { onMount } from 'svelte';
    
    let lightboxActive = $state(false);
    let currentImages = $state([]);
    let currentIndex = $state(0);
    let toastMessage = $state('');
    let toastVisible = $state(false);
    let mouseX = $state(0);
    let mouseY = $state(0);
    let mounted = $state(false);
    let touchStartX = $state(0);
    let touchEndX = $state(0);

    onMount(() => {
        mounted = true;
    });

    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }

    function handleTouchStart(e) {
        touchStartX = e.changedTouches[0].screenX;
    }

    function handleTouchEnd(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                changeImage(1); // Swipe left - next image
            } else {
                changeImage(-1); // Swipe right - previous image
            }
        }
    }

    const projects = [
        {
            id: 1,
            title: 'RGB Necklace',
            tags: ['Hardware', 'Wearable Tech', 'PCB'],
            year: '2026',
            description:
                'A wearable tech necklace that changes rgb led matrix based on environmental data. The challenge was to create a nice design while integrating complex sensors.',
            buttonText: '',
            buttonAction: '',
            buttonScript: () => {
            },
            images: [
                { src: './projects/necklace/render.png', alt: 'RGB Necklace Render' },
                { src: './projects/necklace/pcb.png', alt: 'KiCAD PCB' },
                { src: './projects/necklace/schematic.png', alt: 'KiCAD Schematic' }
            ]
        },
        {
            id: 2,
            title: 'Bowtie Antenna',
            tags: ['Hardware', 'RF', 'PCB'],
            year: '2025',
            description:
                'A compact credit card sized powered antenna made for recieving ham radio signals.',
            buttonText: '',
            buttonAction: '',
            buttonScript: () => {
            },
            images: [
                { src: './projects/bowtie-antenna/close-up.jpg', alt: 'Bowtie Antenna Close-Up' },
                { src: './projects/bowtie-antenna/pcb.png', alt: 'Bowtie Antenna PCB' }
            ]
        },
        {
            id: 3,
            title: 'Security Camera',
            tags: ['Hardware', 'Prototype'],
            year: '2025',
            description:
                'A perfboard prototype of a security camera',
            buttonText: '',
            buttonAction: '',
            buttonScript: () => {
            },
            images: [
                { src: './projects/camera/1.jpg', alt: 'Security Camera' },
                { src: './projects/camera/2.jpg', alt: 'Security Camera' },
                { src: './projects/camera/3.jpg', alt: 'Security Camera' }
            ]
        },
        {
            id: 4,
            title: 'Antennas',
            tags: ['Photography'],
            year: '2025-2026',
            description:
                'A collection of photographs showing my love for infrastructure and antennas.',
            buttonText: '',
            buttonAction: '',
            buttonScript: () => {
            },
            images: [
                { src: './projects/antennas/1.jpg', alt: 'Antenna 1' },
                { src: './projects/antennas/2.jpg', alt: 'Antenna 2' },
                { src: './projects/antennas/3.jpg', alt: 'Antenna 3' },
                { src: './projects/antennas/4.jpg', alt: 'Antenna 4' },
                { src: './projects/antennas/5.jpg', alt: 'Antenna 5' },
                { src: './projects/antennas/6.jpg', alt: 'Antenna 6' },
                { src: './projects/antennas/7.jpg', alt: 'Antenna 7' },
                { src: './projects/antennas/8.jpg', alt: 'Antenna 8' },
                { src: './projects/antennas/9.jpg', alt: 'Antenna 9' },
                { src: './projects/antennas/10.jpg', alt: 'Antenna 10' },
                { src: './projects/antennas/11.jpg', alt: 'Antenna 11' },
                { src: './projects/antennas/12.jpg', alt: 'Antenna 12' }
            ]
        },
        {
            id: 5,
            title: 'Mini Whip',
            tags: ['Hardware', 'RF', 'Antenna'],
            year: '2025',
            description:
                'A compact pcb designed for receiving hf signals based on the PA0RDT mini whip design.',
            buttonText: '',
            buttonAction: '',
            buttonScript: () => {
            },
            images: [
                { src: './projects/pa0rdt/pcb.png', alt: 'PA0RDT Mini Whip PCB' },
                { src: './projects/pa0rdt/schematic.png', alt: 'PA0RDT Mini Whip Schematic' }
            ]
        }
    ];

    function scrollGallery(event, direction) {
        const scroller = event.currentTarget.parentElement.querySelector('.gallery-scroller');
        scroller.scrollBy({ left: direction * 320, behavior: 'smooth' });
    }

    function openLightbox(images, index) {
        currentImages = images;
        currentIndex = index;
        lightboxActive = true;
    }

    function closeLightbox() {
        lightboxActive = false;
    }

    function changeImage(direction) {
        currentIndex += direction;
        if (currentIndex >= currentImages.length) {
            currentIndex = 0;
        } else if (currentIndex < 0) {
            currentIndex = currentImages.length - 1;
        }
    }

    function handleLightboxClick(event) {
        if (event.target === event.currentTarget) {
            closeLightbox();
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Escape' && lightboxActive) {
            closeLightbox();
        }
        if (lightboxActive) {
            if (event.key === 'ArrowLeft') changeImage(-1);
            if (event.key === 'ArrowRight') changeImage(1);
        }
    }

    function showToast(message) {
        toastMessage = message;
        toastVisible = true;
        setTimeout(() => {
            toastVisible = false;
        }, 3000);
    }

    function handleButtonClick(project) {
        if (project.buttonScript && typeof project.buttonScript === 'function') {
            project.buttonScript();
        }
        showToast(project.buttonAction);
    }
</script>

<svelte:head>
    <title>Projects | Ellie Hartung - Hardware & Software Portfolio</title>
    <meta name="description" content="Explore my portfolio of hardware and software projects including PCB designs, RF antennas, wearable tech, and photography. Featured work: RGB Necklace, Bowtie Antenna, Security Camera." />
    <link rel="canonical" href="https://liminal.moe/projects" />
    
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://liminal.moe/projects" />
    <meta property="og:title" content="Projects | Ellie Hartung Portfolio" />
    <meta property="og:description" content="A curated selection of hardware engineering, PCB design, and creative projects by Ellie Hartung." />
    <meta property="og:site_name" content="liminal.moe" />
    
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Projects | Ellie Hartung Portfolio" />
    <meta name="twitter:description" content="Hardware engineering, PCB design, and creative projects." />
    
    <meta name="keywords" content="portfolio, hardware projects, PCB design, wearable tech, RF antenna, electronics, Ellie Hartung, 1vers1on" />
    <meta name="author" content="Ellie Hartung" />
    <meta name="robots" content="index, follow" />
    
    {@html `<script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Projects Portfolio",
        "description": "A curated selection of hardware and software projects by Ellie Hartung",
        "url": "https://liminal.moe/projects",
        "author": {
            "@type": "Person",
            "name": "Ellie Hartung",
            "url": "https://liminal.moe"
        },
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "item": {
                        "@type": "CreativeWork",
                        "name": "RGB Necklace",
                        "description": "A wearable tech necklace with RGB LED matrix",
                        "dateCreated": "2026",
                        "keywords": ["Hardware", "Wearable Tech", "PCB"]
                    }
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "item": {
                        "@type": "CreativeWork",
                        "name": "Bowtie Antenna",
                        "description": "A compact credit card sized powered antenna for ham radio",
                        "dateCreated": "2025",
                        "keywords": ["Hardware", "RF", "PCB"]
                    }
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "item": {
                        "@type": "CreativeWork",
                        "name": "Security Camera",
                        "description": "A perfboard prototype of a security camera",
                        "dateCreated": "2025",
                        "keywords": ["Hardware", "Prototype"]
                    }
                },
                {
                    "@type": "ListItem",
                    "position": 4,
                    "item": {
                        "@type": "CreativeWork",
                        "name": "Antennas Photography",
                        "description": "A collection of infrastructure and antenna photographs",
                        "dateCreated": "2023",
                        "keywords": ["Photography"]
                    }
                }
            ]
        }
    }
    </script>`}
</svelte:head>

<svelte:window onkeydown={handleKeydown} onmousemove={handleMouseMove} />

<!-- Animated background -->
<div class="bg-effects">
    <div class="gradient-orb orb-1"></div>
    <div class="gradient-orb orb-2"></div>
    <div class="gradient-orb orb-3"></div>
    <div class="grid-overlay"></div>
</div>

<!-- Cursor glow effect -->
<div class="cursor-glow" style="left: {mouseX}px; top: {mouseY}px;"></div>

<header class:mounted aria-label="Portfolio introduction">
    <div class="container">
        <span class="label">PORTFOLIO</span>
        <h1>My <span class="gradient-text">Work</span></h1>
        <p>A curated selection of design and development projects.</p>
        <div class="header-decoration" aria-hidden="true">
            <span class="line"></span>
            <span class="diamond">◆</span>
            <span class="line"></span>
        </div>
    </div>
</header>

<main class="container">
    <section class="project-list" aria-label="Project gallery">
        {#each projects as project, projectIndex}
            <article class="project-card" class:mounted style="--delay: {projectIndex * 0.15}s; --accent-hue: {projectIndex * 40 + 200}" aria-labelledby="project-title-{project.id}">
                <div class="card-glow" aria-hidden="true"></div>
                <div class="project-number" aria-hidden="true">0{project.id}</div>
                <div class="project-info">
                    <div class="project-title">
                        <h2 id="project-title-{project.id}">{project.title}</h2>
                        <div class="project-meta">
                            {#each project.tags as tag}
                                <span class="tag">{tag}</span>
                            {/each}
                            <time class="year-badge" datetime="{project.year}">{project.year}</time>
                        </div>
                    </div>
                    {#if project.buttonText}
                        <button class="btn" onclick={() => handleButtonClick(project)}>
                            <span class="btn-text">{project.buttonText}</span>
                            <span class="btn-icon">→</span>
                        </button>
                    {/if}
                </div>
                <div class="project-description">
                    <p>{project.description}</p>
                </div>
                <div class="gallery-wrapper" role="region" aria-label="{project.title} image gallery">
                    <button class="scroll-hint scroll-left" onclick={(e) => scrollGallery(e, -1)} aria-label="Scroll gallery left">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <div class="gallery-scroller">
                        {#each project.images as image, index}
                            <button
                                class="gallery-item"
                                onclick={() => openLightbox(project.images, index)}
                                type="button"
                                aria-label="View {image.alt} in fullscreen"
                            >
                                <img src={image.src} alt={image.alt} loading="lazy" />
                                <div class="gallery-overlay" aria-hidden="true">
                                    <span class="zoom-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="m21 21-4.35-4.35"></path>
                                            <path d="M11 8v6"></path>
                                            <path d="M8 11h6"></path>
                                        </svg>
                                    </span>
                                    <span class="image-label">{image.alt}</span>
                                </div>
                            </button>
                        {/each}
                    </div>
                    <button class="scroll-hint scroll-right" onclick={(e) => scrollGallery(e, 1)} aria-label="Scroll gallery right">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>
            </article>
        {/each}
    </section>
</main>

<footer>
    <div class="footer-content">
        <div class="footer-decoration" aria-hidden="true">
            <span class="line"></span>
            <span class="diamond">◆</span>
            <span class="line"></span>
        </div>
        <p><small>&copy; 2026 Ellie Hartung. <span class="footer-accent">Built with ♥</span></small></p>
    </div>
</footer>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="lightbox" class:active={lightboxActive} onclick={handleLightboxClick} ontouchstart={handleTouchStart} ontouchend={handleTouchEnd} role="dialog" aria-modal="true" aria-label="Image lightbox viewer">
    <div class="lightbox-backdrop"></div>
    <button class="close-btn" onclick={closeLightbox} aria-label="Close lightbox">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
        </svg>
    </button>
    {#if currentImages.length > 0}
        <div class="lightbox-image-container">
            <img
                src={currentImages[currentIndex].src}
                alt={currentImages[currentIndex].alt}
                class="lightbox-content"
            />
        </div>
        <div class="lightbox-info">
            <div class="lightbox-caption">{currentImages[currentIndex].alt || 'Project Detail'}</div>
            <div class="lightbox-counter">{currentIndex + 1} / {currentImages.length}</div>
        </div>
    {/if}
    <div class="lightbox-controls">
        <button class="nav-btn" onclick={() => changeImage(-1)} aria-label="Previous image">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>
        <button class="nav-btn" onclick={() => changeImage(1)} aria-label="Next image">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
    </div>
</div>

<div class="toast" class:show={toastVisible} role="alert" aria-live="polite">
    <span class="toast-icon" aria-hidden="true">✓</span>
    <span class="toast-message">{toastMessage}</span>
</div>

<style>
    :root {
        --bg-color: #050508;
        --surface-color: rgba(20, 22, 30, 0.8);
        --accent-color: #8b5cf6;
        --accent-secondary: #06b6d4;
        --accent-tertiary: #f472b6;
        --text-primary: #ffffff;
        --text-secondary: #94a3b8;
        --spacing-unit: 1rem;
        --border-radius: 16px;
        --transition-speed: 0.4s;
    }

    :global(body) {
        font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: var(--bg-color);
        color: var(--text-primary);
        line-height: 1.7;
        overflow-x: hidden;
        overflow-y: auto;
    }

    :global(html) {
        overflow-y: auto;
        scroll-behavior: smooth;
    }

    .bg-effects {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
        overflow: hidden;
    }

    .gradient-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        opacity: 0.5;
        animation: float 20s ease-in-out infinite;
    }

    @media (max-width: 768px) {
        .gradient-orb {
            opacity: 0.3;
            filter: blur(60px);
        }

        .orb-1 {
            width: 400px;
            height: 400px;
        }

        .orb-2 {
            width: 350px;
            height: 350px;
        }

        .orb-3 {
            width: 300px;
            height: 300px;
        }
    }

    .orb-1 {
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, var(--accent-color) 0%, transparent 70%);
        top: -200px;
        right: -100px;
        animation-delay: 0s;
    }

    .orb-2 {
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, var(--accent-secondary) 0%, transparent 70%);
        bottom: -150px;
        left: -100px;
        animation-delay: -7s;
    }

    .orb-3 {
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, var(--accent-tertiary) 0%, transparent 70%);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation-delay: -14s;
    }

    @keyframes float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        25% { transform: translate(50px, -30px) scale(1.1); }
        50% { transform: translate(-30px, 50px) scale(0.9); }
        75% { transform: translate(-50px, -20px) scale(1.05); }
    }

    .grid-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: 
            linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px);
        background-size: 60px 60px;
        mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, black 70%, transparent 100%);
    }

    .cursor-glow {
        position: fixed;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        transform: translate(-50%, -50%);
        z-index: 0;
        transition: opacity 0.3s;
    }

    @media (max-width: 768px) {
        .cursor-glow {
            display: none;
        }
    }

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 24px;
        position: relative;
    }

    header {
        padding: 6rem 0 3rem;
        text-align: center;
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    header.mounted {
        opacity: 1;
        transform: translateY(0);
    }

    .label {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 3px;
        color: var(--accent-color);
        background: rgba(139, 92, 246, 0.1);
        padding: 8px 16px;
        border-radius: 30px;
        border: 1px solid rgba(139, 92, 246, 0.3);
        margin-bottom: 1.5rem;
    }

    header h1 {
        font-size: clamp(3rem, 8vw, 5rem);
        font-weight: 800;
        margin-bottom: 1rem;
        letter-spacing: -2px;
    }

    .gradient-text {
        background: linear-gradient(135deg, var(--accent-color), var(--accent-secondary), var(--accent-tertiary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        background-size: 200% 200%;
        animation: gradient-shift 5s ease infinite;
    }

    @keyframes gradient-shift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
    }

    header p {
        color: var(--text-secondary);
        font-size: 1.25rem;
        max-width: 500px;
        margin: 0 auto;
    }

    .header-decoration, .footer-decoration {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        margin-top: 2rem;
    }

    .header-decoration .line, .footer-decoration .line {
        width: 60px;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
    }

    .diamond {
        color: var(--accent-color);
        font-size: 0.6rem;
        animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
    }

    .project-list {
        display: flex;
        flex-direction: column;
        gap: 5rem;
        padding-bottom: 6rem;
    }

    .project-card {
        background: var(--surface-color);
        backdrop-filter: blur(20px);
        border-radius: var(--border-radius);
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
        position: relative;
        opacity: 0;
        transform: translateY(40px);
        transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        transition-delay: var(--delay);
    }

    .project-card.mounted {
        opacity: 1;
        transform: translateY(0);
    }

    .project-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, 
            transparent, 
            hsl(calc(var(--accent-hue, 260)), 80%, 65%), 
            transparent);
        opacity: 0;
        transition: opacity 0.4s;
    }

    .project-card:hover::before {
        opacity: 1;
    }

    .project-card:hover {
        transform: translateY(-8px);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 60px -15px hsla(calc(var(--accent-hue, 260)), 70%, 50%, 0.2);
    }

    .card-glow {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
            rgba(139, 92, 246, 0.08) 0%, 
            transparent 50%);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s;
    }

    .project-card:hover .card-glow {
        opacity: 1;
    }

    .project-number {
        position: absolute;
        top: 1.5rem;
        right: 2rem;
        font-size: 4rem;
        font-weight: 900;
        color: rgba(255, 255, 255, 0.03);
        letter-spacing: -3px;
        pointer-events: none;
        transition: all 0.4s;
    }

    .project-card:hover .project-number {
        color: rgba(139, 92, 246, 0.1);
        transform: scale(1.1);
    }

    .project-info {
        padding: 2.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
    }

    .project-title h2 {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 0.75rem;
        letter-spacing: -0.5px;
    }

    .project-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
    }

    .tag {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.2));
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 600;
        border: 1px solid rgba(139, 92, 246, 0.3);
        transition: all 0.3s;
    }

    .tag:hover {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(6, 182, 212, 0.4));
        transform: translateY(-2px);
    }

    .year-badge {
        color: var(--text-secondary);
        font-size: 0.85rem;
        font-weight: 500;
    }

    .project-description {
        padding: 1.5rem 2.5rem 2rem;
        color: var(--text-secondary);
        max-width: 800px;
        font-size: 1.05rem;
    }

    .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        background: linear-gradient(135deg, var(--accent-color), #7c3aed);
        color: white;
        padding: 1rem 1.75rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.95rem;
        border: none;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: all 0.3s;
    }

    .btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transform: translateX(-100%);
        transition: transform 0.5s;
    }

    .btn:hover::before {
        transform: translateX(100%);
    }

    .btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 30px -10px rgba(139, 92, 246, 0.5);
    }

    .btn-icon {
        transition: transform 0.3s;
    }

    .btn:hover .btn-icon {
        transform: translateX(4px);
    }

    .gallery-wrapper {
        position: relative;
        width: 100%;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.5) 100%);
    }

    .gallery-scroller {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        gap: 16px;
        padding: 24px;
        scrollbar-width: none;
    }

    .gallery-scroller::-webkit-scrollbar {
        display: none;
    }

    .gallery-item {
        flex: 0 0 auto;
        width: 280px;
        height: 200px;
        scroll-snap-align: center;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        position: relative;
        border: none;
        padding: 0;
        background: none;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @media (min-width: 768px) {
        .gallery-item {
            width: 420px;
            height: 280px;
        }
    }

    @media (max-width: 480px) {
        .gallery-item {
            width: 85vw;
            height: 220px;
        }
    }

    .gallery-item::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 12px;
        border: 2px solid transparent;
        transition: border-color 0.3s;
    }

    .gallery-item:hover::after {
        border-color: var(--accent-color);
    }

    .gallery-item:hover {
        transform: scale(1.03);
        z-index: 2;
    }

    .gallery-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s ease;
    }

    .gallery-item:hover img {
        transform: scale(1.1);
    }

    .gallery-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 30%, rgba(0, 0, 0, 0.8) 100%);
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        padding: 1.5rem;
        opacity: 0;
        transition: opacity 0.4s;
    }

    .gallery-item:hover .gallery-overlay {
        opacity: 1;
    }

    .zoom-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        color: white;
        opacity: 0;
        transition: all 0.3s;
    }

    .gallery-item:hover .zoom-icon {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }

    .image-label {
        color: white;
        font-size: 0.9rem;
        font-weight: 500;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }

    .scroll-hint {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(20, 22, 30, 0.9);
        backdrop-filter: blur(10px);
        color: white;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
        opacity: 0;
        transition: all 0.3s;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .gallery-wrapper:hover .scroll-hint {
        opacity: 1;
    }

    .scroll-hint:hover {
        background: var(--accent-color);
        border-color: var(--accent-color);
        transform: translateY(-50%) scale(1.1);
    }

    .scroll-left {
        left: 16px;
    }

    .scroll-right {
        right: 16px;
    }

    footer {
        text-align: center;
        padding: 3rem 2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        color: var(--text-secondary);
        margin-top: 2rem;
    }

    .footer-content p {
        margin-top: 1.5rem;
    }

    .footer-accent {
        color: var(--accent-tertiary);
    }

    /* Lightbox */
    .lightbox {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.4s ease;
    }

    .lightbox.active {
        opacity: 1;
        pointer-events: auto;
    }

    .lightbox-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(20px);
    }

    .lightbox-image-container {
        position: relative;
        z-index: 1;
    }

    .lightbox-content {
        max-width: 90vw;
        max-height: 75vh;
        border-radius: 12px;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
        animation: lightbox-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes lightbox-enter {
        from {
            opacity: 0;
            transform: scale(0.9);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .lightbox-info {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1.5rem;
    }

    .lightbox-caption {
        color: #fff;
        font-size: 1.1rem;
        font-weight: 500;
    }

    .lightbox-counter {
        color: var(--text-secondary);
        font-size: 0.85rem;
    }

    .lightbox-controls {
        position: relative;
        z-index: 1;
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 1.5rem;
    }

    .nav-btn {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
    }

    .nav-btn:hover {
        background: var(--accent-color);
        border-color: var(--accent-color);
        transform: scale(1.1);
    }

    .close-btn {
        position: absolute;
        top: 24px;
        right: 24px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
        z-index: 2;
    }

    .close-btn:hover {
        background: rgba(239, 68, 68, 0.8);
        border-color: transparent;
        transform: rotate(90deg);
    }

    /* Toast */
    .toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: var(--surface-color);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-left: 4px solid var(--accent-color);
        color: var(--text-primary);
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
        transform: translateY(120px);
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 2000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .toast.show {
        transform: translateY(0);
    }

    .toast-icon {
        width: 24px;
        height: 24px;
        background: linear-gradient(135deg, var(--accent-color), var(--accent-secondary));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
    }

    .toast-message {
        font-weight: 500;
    }

    /* Responsive */
    @media (max-width: 640px) {
        header {
            padding: 4rem 0 2rem;
        }

        header h1 {
            font-size: 2.5rem;
            letter-spacing: -1px;
        }

        header p {
            font-size: 1rem;
            padding: 0 1rem;
        }

        .label {
            font-size: 0.65rem;
            padding: 6px 12px;
        }

        .project-info {
            padding: 1.5rem;
            flex-direction: column;
            align-items: flex-start;
        }

        .project-title h2 {
            font-size: 1.5rem;
        }

        .project-meta {
            gap: 0.5rem;
        }

        .tag {
            font-size: 0.6rem;
            padding: 4px 10px;
        }

        .project-description {
            padding: 1rem 1.5rem 1.5rem;
            font-size: 0.95rem;
        }

        .project-number {
            font-size: 3rem;
            top: 1rem;
            right: 1rem;
        }

        .project-list {
            gap: 3rem;
        }

        .btn {
            width: 100%;
            justify-content: center;
            padding: 0.875rem 1.5rem;
        }

        .gallery-scroller {
            padding: 16px;
            gap: 12px;
        }

        .scroll-hint {
            width: 40px;
            height: 40px;
            opacity: 0.8;
        }

        .scroll-left {
            left: 8px;
        }

        .scroll-right {
            right: 8px;
        }

        .gallery-wrapper:hover .scroll-hint {
            opacity: 1;
        }

        /* Always show scroll hints on mobile for better UX */
        .gallery-wrapper .scroll-hint {
            opacity: 0.6;
        }

        .header-decoration .line, .footer-decoration .line {
            width: 40px;
        }

        footer {
            padding: 2rem 1rem;
        }

        .container {
            padding: 0 16px;
        }
    }

    @media (max-width: 480px) {
        header {
            padding: 3rem 0 1.5rem;
        }

        header h1 {
            font-size: 2rem;
        }

        .project-info {
            padding: 1.25rem;
        }

        .project-description {
            padding: 0.75rem 1.25rem 1.25rem;
        }

        .project-number {
            font-size: 2.5rem;
            opacity: 0.5;
        }

        .gallery-item {
            border-radius: 8px;
        }

        .gallery-overlay {
            opacity: 1;
            background: linear-gradient(180deg, transparent 50%, rgba(0, 0, 0, 0.7) 100%);
        }

        .zoom-icon {
            display: none;
        }
    }

    /* Lightbox mobile styles */
    @media (max-width: 768px) {
        .lightbox-content {
            max-width: 95vw;
            max-height: 60vh;
            border-radius: 8px;
        }

        .lightbox-info {
            margin-top: 1rem;
            padding: 0 1rem;
            text-align: center;
        }

        .lightbox-caption {
            font-size: 0.95rem;
        }

        .lightbox-controls {
            margin-top: 1rem;
            gap: 0.75rem;
        }

        .nav-btn {
            width: 48px;
            height: 48px;
        }

        .close-btn {
            top: 16px;
            right: 16px;
            width: 44px;
            height: 44px;
        }
    }

    /* Toast mobile styles */
    @media (max-width: 640px) {
        .toast {
            left: 16px;
            right: 16px;
            bottom: 16px;
            padding: 0.875rem 1rem;
        }
    }

    /* Touch-friendly improvements */
    @media (hover: none) and (pointer: coarse) {
        .gallery-item:hover {
            transform: none;
        }

        .gallery-item:hover img {
            transform: none;
        }

        .gallery-item:active {
            transform: scale(0.98);
        }

        .gallery-overlay {
            opacity: 1;
            background: linear-gradient(180deg, transparent 60%, rgba(0, 0, 0, 0.6) 100%);
        }

        .zoom-icon {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(0.9);
        }

        .project-card:hover {
            transform: none;
        }

        .project-card:active {
            transform: scale(0.995);
        }

        .tag:hover {
            transform: none;
        }

        .btn:hover {
            transform: none;
        }

        .btn:active {
            transform: scale(0.98);
        }

        .nav-btn:hover {
            transform: none;
        }

        .nav-btn:active {
            transform: scale(0.95);
            background: var(--accent-color);
        }

        .scroll-hint {
            opacity: 0.7;
        }

        .scroll-hint:hover {
            transform: translateY(-50%);
        }

        .scroll-hint:active {
            transform: translateY(-50%) scale(0.95);
            background: var(--accent-color);
        }
    }

    /* Landscape mobile */
    @media (max-height: 500px) and (orientation: landscape) {
        header {
            padding: 2rem 0 1rem;
        }

        header h1 {
            font-size: 2rem;
        }

        .header-decoration {
            margin-top: 1rem;
        }

        .lightbox-content {
            max-height: 70vh;
        }

        .lightbox-info {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 0;
            background: rgba(0, 0, 0, 0.7);
            padding: 0.5rem 1rem;
            border-radius: 8px;
        }

        .lightbox-controls {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 100%;
            justify-content: space-between;
            padding: 0 1rem;
            margin-top: 0;
        }
    }
</style>