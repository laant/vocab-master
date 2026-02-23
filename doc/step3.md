<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Step 3: Active Recall Spelling | Mastery Platform</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
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
                        "display": ["Lexend", "sans-serif"]
                    },
                    borderRadius: {
                        "DEFAULT": "0.5rem",
                        "lg": "1rem",
                        "xl": "1.5rem",
                        "full": "9999px"
                    },
                },
            },
        }
    </script>
</head>
<body class="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
<div class="layout-container flex h-full grow flex-col">
<!-- Top Navigation Bar -->
<header class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark px-6 py-3 lg:px-40">
<div class="flex items-center gap-4">
<div class="text-primary">
<span class="material-symbols-outlined text-3xl">temp_preferences_custom</span>
</div>
<h2 class="text-lg font-bold tracking-tight">Mastery Platform</h2>
</div>
<div class="hidden md:flex flex-1 justify-end gap-8 px-10">
<div class="flex items-center gap-9">
<a class="text-sm font-medium hover:text-primary transition-colors" href="#">Dashboard</a>
<a class="text-sm font-medium hover:text-primary transition-colors" href="#">My Progress</a>
<a class="text-sm font-medium hover:text-primary transition-colors" href="#">Vocabulary</a>
<a class="text-sm font-medium hover:text-primary transition-colors" href="#">Settings</a>
</div>
</div>
<div class="flex items-center gap-3">
<button class="flex items-center justify-center rounded-xl h-10 w-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
<span class="material-symbols-outlined">notifications</span>
</button>
<div class="bg-primary/10 rounded-full p-1">
<div class="h-8 w-8 rounded-full bg-cover bg-center" data-alt="User profile avatar of a student" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDXVSCtfnXy8dsHb3pEVsKc7Jv2-xFNTVk_quaRraqtfElWRiPuq5g-1uJjSeAKnqY-YJSUEWeRBC_DDs0WRy-gRNZ9eYWkNfLEIp31ISvHx_rqIeDy0bdBzfe2_1PgWOJW_ZXL75PVOKZINQLWtujjL-61W5V2h9EvtxVQceF9vMfuTqsqR0zviiDYnxi_mA6MugGL9VqNZWs5DLJREgU1RESSJDpsr9I5fYTTgz8Y118kanQ6giD36JG1zhgQtl8LlAUc4AvZfJw')"></div>
</div>
</div>
</header>
<main class="flex-1 flex flex-col md:flex-row lg:px-40 py-8 gap-8">
<!-- Left Sidebar: Progress Navigation -->
<aside class="w-full md:w-72 flex flex-col gap-6 px-4 md:px-0">
<div class="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
<h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Mastery Process</h3>
<nav class="flex flex-col gap-2">
<div class="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-500">
<span class="material-symbols-outlined">info</span>
<p class="text-sm font-medium">1. Introduction</p>
<span class="material-symbols-outlined ml-auto text-green-500">check_circle</span>
</div>
<div class="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-500">
<span class="material-symbols-outlined">link</span>
<p class="text-sm font-medium">2. Association</p>
<span class="material-symbols-outlined ml-auto text-green-500">check_circle</span>
</div>
<div class="flex items-center gap-3 px-3 py-3 rounded-lg bg-primary/10 text-primary border border-primary/20">
<span class="material-symbols-outlined fill-1">edit</span>
<p class="text-sm font-bold">3. Recall</p>
</div>
<div class="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 dark:text-slate-600">
<span class="material-symbols-outlined">book</span>
<p class="text-sm font-medium">4. Application</p>
</div>
<div class="flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 dark:text-slate-600">
<span class="material-symbols-outlined text-slate-400">verified</span>
<p class="text-sm font-medium">5. Mastery</p>
</div>
</nav>
</div>
<div class="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
<div class="flex justify-between items-end mb-2">
<span class="text-xs font-bold text-slate-500 uppercase">Daily Goal</span>
<span class="text-sm font-bold text-primary">80%</span>
</div>
<div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
<div class="bg-primary h-full w-[80%]" style="width: 80%;"></div>
</div>
<p class="text-[10px] text-slate-400 mt-3 leading-relaxed">You're 4 words away from your daily streak! Keep going.</p>
</div>
</aside>
<!-- Center Content: Spelling Challenge -->
<section class="flex-1 flex flex-col gap-6 px-4 md:px-0">
<!-- Header Stats -->
<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 gap-4">
<div class="flex flex-col">
<h2 class="text-lg font-bold">Step 3: Active Recall Spelling</h2>
<p class="text-sm text-slate-500">Recall and spell the missing letters</p>
</div>
<div class="flex items-center gap-4 w-full sm:w-auto">
<div class="flex-1 sm:flex-none">
<div class="flex justify-between text-xs font-bold text-slate-500 mb-1">
<span>Word Progress</span>
<span>3/5</span>
</div>
<div class="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
<div class="bg-primary h-full" style="width: 60%;"></div>
</div>
</div>
</div>
</div>
<!-- Main Challenge Card -->
<div class="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8 md:p-12 flex flex-col items-center justify-center relative">
<!-- Sound Hint Button -->
<button class="absolute top-6 right-6 p-3 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-all">
<span class="material-symbols-outlined text-2xl">volume_up</span>
</button>
<!-- Target Word (Korean) -->
<div class="text-center mb-12">
<h1 class="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">성취하다</h1>
<p class="text-slate-400 text-lg">Type or click the missing letters</p>
</div>
<!-- Spelling Puzzle -->
<div class="flex flex-wrap justify-center gap-3 mb-16">
<!-- 'a' -->
<div class="w-14 h-16 md:w-16 md:h-20 flex items-center justify-center rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-3xl font-bold">a</div>
<!-- blank for 'c' -->
<div class="w-14 h-16 md:w-16 md:h-20 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 text-3xl font-bold text-primary animate-pulse">_</div>
<!-- 'h' -->
<div class="w-14 h-16 md:w-16 md:h-20 flex items-center justify-center rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-3xl font-bold">h</div>
<!-- blank for 'i' -->
<div class="w-14 h-16 md:w-16 md:h-20 flex items-center justify-center rounded-lg border-2 border-slate-200 dark:border-slate-700 text-3xl font-bold text-slate-300 dark:text-slate-600">_</div>
<!-- 'e' -->
<div class="w-14 h-16 md:w-16 md:h-20 flex items-center justify-center rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-3xl font-bold">e</div>
<!-- blank for 'v' -->
<div class="w-14 h-16 md:w-16 md:h-20 flex items-center justify-center rounded-lg border-2 border-slate-200 dark:border-slate-700 text-3xl font-bold text-slate-300 dark:text-slate-600">_</div>
<!-- 'e' -->
<div class="w-14 h-16 md:w-16 md:h-20 flex items-center justify-center rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-3xl font-bold">e</div>
</div>
<!-- Letter Bank -->
<div class="w-full max-w-md">
<div class="flex justify-center gap-4 flex-wrap">
<button class="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-md hover:border-primary hover:text-primary transition-all flex items-center justify-center text-2xl font-bold">c</button>
<button class="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-md hover:border-primary hover:text-primary transition-all flex items-center justify-center text-2xl font-bold">i</button>
<button class="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-md hover:border-primary hover:text-primary transition-all flex items-center justify-center text-2xl font-bold">v</button>
<button class="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-md hover:border-primary hover:text-primary transition-all flex items-center justify-center text-2xl font-bold">e</button>
</div>
</div>
<!-- Footer Actions -->
<div class="mt-16 flex items-center gap-4 w-full justify-between max-w-md">
<button class="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
<span class="material-symbols-outlined">lightbulb</span>
                            Hint
                        </button>
<button class="flex-[2] h-14 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity">
                            Check Answer
                        </button>
</div>
</div>
<!-- Footer Navigation -->
<div class="flex justify-between items-center py-4">
<button class="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary transition-colors">
<span class="material-symbols-outlined">arrow_back</span>
                        Previous Step
                    </button>
<div class="flex items-center gap-2">
<span class="h-2 w-2 rounded-full bg-slate-300"></span>
<span class="h-2 w-2 rounded-full bg-slate-300"></span>
<span class="h-2 w-6 rounded-full bg-primary"></span>
<span class="h-2 w-2 rounded-full bg-slate-300"></span>
<span class="h-2 w-2 rounded-full bg-slate-300"></span>
</div>
<button class="flex items-center gap-2 text-sm font-semibold text-slate-400 cursor-not-allowed">
                        Next Step
                        <span class="material-symbols-outlined">arrow_forward</span>
</button>
</div>
</section>
</main>
</div>
</body></html>