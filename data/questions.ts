export interface Question {
    id: number;
    text: string;
    options: string[];
    correctAnswerIndex: number;
    fact?: string;
}

export const quizQuestions: Question[] = [
    {
        id: 1,
        text: "Which typeface is used throughout the Creamos brand identity?",
        options: ["Inter", "Raleway", "Montserrat", "Poppins"],
        correctAnswerIndex: 3,
        fact: "Poppins is a geometric sans-serif from Google Fonts that gives the Creamos brand a friendly, modern feel.",
    },
    {
        id: 2,
        text: "Which organisation was the game 'Balancing the Grid' originally proposed for?",
        options: [
            "National Grid Electricity Distribution",
            "Science Museum of London",
            "Ofgem",
            "NESO — National Energy System Operator",
        ],
        correctAnswerIndex: 1,
        fact: "Balancing the Grid was originally proposed for the Science Museum of London. When the museum took no further action, NESO commissioned Creamos to develop it.",
    },
    {
        id: 3,
        text: "Which game engine was used to build Balancing the Grid?",
        options: ["Unreal Engine", "Unity", "Godot", "GameMaker"],
        correctAnswerIndex: 1,
        fact: "Creamos built Balancing the Grid in Unity, pairing the engine with a fresh visual identity designed to make NESO's brand feel approachable.",
    },
    {
        id: 4,
        text: "What concept does Balancing the Grid teach players about?",
        options: [
            "Renewable energy investment strategies",
            "Carbon offset trading",
            "Keeping Britain's energy grid in balance",
            "Smart home energy monitoring",
        ],
        correctAnswerIndex: 2,
        fact: "Players manage system costs, environmental impact, and grid frequency to keep Britain's electricity supply stable.",
    },
    {
        id: 5,
        text: "Story Spark is an AI-powered platform that creates personalised stories for whom?",
        options: ["Elderly care home residents", "Corporate training programmes", "Children", "Museum visitors"],
        correctAnswerIndex: 2,
        fact: "Creamos delivered a bold rebrand for Story Spark, an AI platform that generates personalised stories for children.",
    },
    {
        id: 6,
        text: "Which university was involved in research for the Resbite app?",
        options: ["University of Edinburgh", "Keele University", "University of Bath", "University of Exeter"],
        correctAnswerIndex: 1,
        fact: "Keele University was a research partner in the development of Resbite, grounding the app's social-bonding approach in academic study.",
    },
    {
        id: 7,
        text: "What two deliverables did Creamos produce for the Arya Douge project?",
        options: [
            "A mobile app and a social strategy",
            "A pitch deck and an investor presentation",
            "Brand guidelines and a portfolio website",
            "An advertising campaign and a press kit",
        ],
        correctAnswerIndex: 2,
        fact: "Creamos created brand guidelines and a portfolio website for Arya Douge, a luxury architectural design studio.",
    },
    {
        id: 8,
        text: "Eggbods was an ethically designed NFT collection dropped on which marketplace?",
        options: ["Rarible", "Foundation", "OpenSea", "SuperRare"],
        correctAnswerIndex: 2,
        fact: "Creamos designed Eggbods as an ethically considered NFT collection, releasing new pieces daily on OpenSea.",
    },
    {
        id: 9,
        text: "Remember Imogen? Which of the following projects did she not take part in?",
        options: ["I Love Dragon Quest", "Story Spark", "Balancing the Grid", "CHOC Factory"],
        correctAnswerIndex: 1,
        fact: "Imogen worked on I Love Dragon Quest, Balancing the Grid, and CHOC Factory — Story Spark wasn't one of hers.",
    },
    {
        id: 10,
        text: "What animal destroyed Stephen's carpet at a previous home of his?",
        options: ["Hamster", "Dog", "Cat", "Raccoon"],
        correctAnswerIndex: 0,
        fact: "A hamster was responsible for the infamous carpet incident at one of Stephen's previous homes.",
    },
    {
        id: 11,
        text: "Which of these clients or stakeholders was known for having a bad temper?",
        options: ["Nima", "Robert D.", "Paul", "Olivia"],
        correctAnswerIndex: 0,
        fact: "Some clients leave a stronger impression than others…",
    },
    {
        id: 13,
        text: "Who fainted on his first day working at Creamos?",
        options: ["Fermin", "Martin Vainstein", "Sol", "Ignacio"],
        correctAnswerIndex: 1,
        fact: "Martin Vainstein made quite an entrance on his first day at Creamos.",
    },
    {
        id: 14,
        text: "What did Lili use to serve in excess for Together Days?",
        options: ["Alfajores", "Medialunas", "Bizcochitos", "Sweets"],
        correctAnswerIndex: 1,
        fact: "Lili's medialunas became a staple of Creamos Together Days — always in generous supply.",
    },
    {
        id: 15,
        text: "Which client requested a piece of work for the same day on a Black Friday?",
        options: ["Story Spark", "CHOC Factory", "Annie Intl.", "Arya Douge"],
        correctAnswerIndex: 1,
        fact: "CHOC Factory managed to request same-day work on a Black Friday — a Creamos legend.",
    },
    {
        id: 16,
        text: "If Lili were to open a gallery featuring her Together Friday drawings, what would the critic's main takeaway be?",
        options: [
            "Perfect anatomical accuracy.",
            "The obvious work of a modern Da Vinci.",
            "Flawless use of perspective and shading.",
            "Like Picasso, but blindfolded.",
        ],
        correctAnswerIndex: 3,
        fact: "Lili's Together Friday drawings are a beloved Creamos tradition — technically unique, emotionally unforgettable.",
    },
    {
        id: 17,
        text: "When Hans invited you to a \"quick 5-minute catch-up,\" what should you realistically prepare for?",
        options: [
            "Uncomfortable, prolonged silences.",
            "A multi-generational saga.",
            "Ruthless, to-the-point efficiency.",
            "Getting out two minutes early.",
        ],
        correctAnswerIndex: 1,
        fact: "Hans's catch-ups are legendary for their depth, warmth, and generous relationship with the concept of time.",
    },
];
