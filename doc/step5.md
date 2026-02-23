<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Step 5 Mastery and Reward Dashboard</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              colors: {
                "primary": "#137fec",
                "background-light": "#f6f7f8",
                "background-dark": "#101922",
              },
              fontFamily: {
                "display": ["Lexend"]
              },
              borderRadius: {"DEFAULT": "0.5rem", "lg": "1rem", "xl": "1.5rem", "full": "9999px"},
            },
          },
        }
      </script>
</head>
<body class="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
<div class="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
<div class="layout-container flex h-full grow flex-col">
<!-- Top Navigation Bar -->
<header class="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-background-dark sticky top-0 z-50">
<div class="flex items-center gap-8">
<div class="flex items-center gap-3 text-primary">
<span class="material-symbols-outlined text-3xl">school</span>
<h2 class="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">VocabMaster</h2>
</div>
<nav class="hidden md:flex items-center gap-9">
<a class="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors" href="#">Dashboard</a>
<a class="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors" href="#">My Library</a>
<a class="text-primary text-sm font-bold" href="#">Step 5: Mastery</a>
<a class="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors" href="#">Settings</a>
</nav>
</div>
<div class="flex flex-1 justify-end gap-4 items-center">
<div class="hidden sm:flex items-center bg-primary/10 px-3 py-1 rounded-full text-primary font-bold text-sm">
<span class="material-symbols-outlined text-sm mr-1">local_fire_department</span> 15 Day Streak
                    </div>
<div class="bg-slate-200 dark:bg-slate-700 bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary" data-alt="User profile avatar circle" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuD_T6u79GOR3iuiWZt2zibd-p3g0M5jerjeS0nFIibuT4PaLzhsaETjluNP60vGIECYOXeTzJfF7tLomo_XJ9RaE-tnV-Y0JTbtr34PTdkUSUSC_TjG230iaoFjUXIeJf7ak0itOri89zRdW1N4cjkhhvxsjqAKzFJCBnc7Nwis1V6d2EtYTXathcjaeynRoI0hjQCU9VnXIHPFYcyaXGCX5XOqlMCZAYWc3B_RK0U-dyQrNnzYEgeXL0si4LAv5r-0hmr_7BqmHPw");'></div>
</div>
</header>
<main class="flex flex-1 justify-center py-10 px-4 md:px-10">
<div class="layout-content-container flex flex-col max-w-[800px] flex-1">
<!-- Celebration Hero Section -->
<div class="flex flex-col items-center text-center mb-10">
<div class="relative mb-6">
<!-- Shiny Badge/Trophy -->
<div class="size-48 bg-gradient-to-tr from-yellow-300 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/20 relative overflow-hidden">
<div class="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full animate-[pulse_3s_infinite]"></div>
<span class="material-symbols-outlined text-white text-8xl" style="font-variation-settings: 'FILL' 1">emoji_events</span>
</div>
<div class="absolute -top-4 -right-4 bg-primary text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                                LEVEL 12
                            </div>
</div>
<h1 class="text-slate-900 dark:text-white tracking-tight text-4xl md:text-5xl font-extrabold leading-tight mb-2">Level Up!</h1>
<p class="text-slate-600 dark:text-slate-400 text-lg max-w-md">Incredible work! You've successfully completed the Mastery Step for this session.</p>
</div>
<!-- Mastery Statistics -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
<div class="flex flex-col gap-2 rounded-xl p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
<div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span class="material-symbols-outlined text-6xl">verified</span>
</div>
<p class="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Perfectly Mastered</p>
<div class="flex items-baseline gap-2">
<p class="text-slate-900 dark:text-white tracking-tight text-4xl font-bold">10 Words</p>
<p class="text-green-500 text-base font-bold flex items-center"><span class="material-symbols-outlined text-sm">trending_up</span> +100%</p>
</div>
<p class="text-slate-600 dark:text-slate-400 text-sm mt-2 italic">"Ubiquitous, Eloquent, Resilient..."</p>
</div>
<div class="flex flex-col gap-2 rounded-xl p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
<div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span class="material-symbols-outlined text-6xl">update</span>
</div>
<p class="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Review Tomorrow</p>
<p class="text-slate-900 dark:text-white tracking-tight text-4xl font-bold">4 Words</p>
<p class="text-primary text-sm font-medium mt-2 flex items-center gap-1">
<span class="material-symbols-outlined text-sm">calendar_today</span> 
                                Spaced repetition active
                            </p>
</div>
</div>
<!-- Remediation & Retention Section -->
<div class="bg-primary/5 dark:bg-primary/10 rounded-xl p-6 border border-primary/20 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
<div class="flex items-start gap-4 text-center md:text-left">
<div class="bg-primary text-white p-3 rounded-lg hidden sm:block">
<span class="material-symbols-outlined">psychology</span>
</div>
<div>
<h3 class="text-slate-900 dark:text-white font-bold text-lg leading-snug">Targeted Review Needed?</h3>
<p class="text-slate-600 dark:text-slate-400 text-sm">You had some trouble with <span class="font-bold text-primary">"Capricious"</span> and <span class="font-bold text-primary">"Mitigate"</span>. Review them now while they're fresh!</p>
</div>
</div>
<button class="bg-white dark:bg-slate-800 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all px-6 py-3 rounded-lg font-bold shadow-sm flex items-center gap-2 whitespace-nowrap">
<span class="material-symbols-outlined text-lg">bolt</span>
                            Targeted Review
                        </button>
</div>
<!-- Main Call to Action -->
<div class="flex flex-col gap-4 mt-4">
<button class="w-full bg-primary hover:bg-blue-600 text-white text-lg font-bold py-5 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3">
                            Continue to Next Level
                            <span class="material-symbols-outlined">arrow_forward</span>
</button>
<button class="w-full bg-transparent text-slate-500 dark:text-slate-400 font-medium py-3 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                            Return to Dashboard
                        </button>
</div>
<!-- Footer Info -->
<div class="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
<div class="flex justify-center gap-6 mb-4">
<div class="flex flex-col items-center">
<span class="text-2xl font-bold text-slate-900 dark:text-white">12,450</span>
<span class="text-xs text-slate-500 uppercase font-bold tracking-widest">Total XP</span>
</div>
<div class="w-px h-8 bg-slate-200 dark:bg-slate-800 self-center"></div>
<div class="flex flex-col items-center">
<span class="text-2xl font-bold text-slate-900 dark:text-white">452</span>
<span class="text-xs text-slate-500 uppercase font-bold tracking-widest">Words Known</span>
</div>
</div>
<p class="text-slate-400 text-xs">Middle School Vocabulary Builder • Mastery Path 5 of 5</p>
</div>
</div>
</main>
</div>
</div>
</body></html>