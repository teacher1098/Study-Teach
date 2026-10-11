import type { MindmapData, SimulatorData, QuizCardData, SocraticNoteData } from '../types';

export interface SocraticResult {
  spokenReply: string;
  displayReply: string;
  mindmap?: MindmapData;
  simulator?: SimulatorData;
  quiz?: QuizCardData;
  note?: SocraticNoteData;
}

export function generateSocraticResponse(
  userQuery: string,
  docTitle: string,
  docContext: string,
  currentPage: number
): SocraticResult {
  const q = userQuery.toLowerCase().trim();
  const title = docTitle || 'Academic Study';
  const timestamp = new Date().toISOString();

  // 1. Check if user asked for a quiz or test
  if (q.includes('quiz') || q.includes('test me') || q.includes('exam') || q.includes('practice question')) {
    const tier = q.includes('hard') ? 'hard' : q.includes('easy') ? 'easy' : 'medium';
    const quiz = generateQuizArtifact(title, docContext, tier);
    return {
      spokenReply: `I've prepared a ${tier} difficulty concept check for you on ${title}. Check the quiz card on your right panel and see if you can identify the correct principle.`,
      displayReply: `I've generated a **${tier.toUpperCase()}** difficulty quiz card based on ${title}. Try selecting your answer to test your comprehension.`,
      quiz,
    };
  }

  // 2. Check if user asked for a diagram, flowchart, or mindmap
  if (q.includes('diagram') || q.includes('mindmap') || q.includes('flowchart') || q.includes('visual') || q.includes('map') || q.includes('graph')) {
    const mindmap = generateMindmapArtifact(title, docContext);
    return {
      spokenReply: `I've rendered an interactive visual mindmap on your screen mapping out the core concepts and interconnections of ${title}.`,
      displayReply: `Here is an interactive conceptual mindmap breaking down **${title}**. You can zoom, pan, and inspect the structural relationships.`,
      mindmap,
    };
  }

  // 3. Check if user asked for a calculation, simulator, or formula experiment
  if (q.includes('simulate') || q.includes('calculate') || q.includes('formula') || q.includes('slider') || q.includes('model') || q.includes('math')) {
    const simulator = generateSimulatorArtifact(title, docContext);
    return {
      spokenReply: `I've built an interactive formula simulator for you with adjustable parameters. Move the sliders to test how varying the inputs impacts the physical outcome.`,
      displayReply: `I've created an interactive formula calculator for **${title}**. Try dragging the sliders in the right panel to observe the mathematical relationship in real time.`,
      simulator,
    };
  }

  // 4. Content-aware academic responses
  let spoken = '';
  let display = '';
  let mindmap: MindmapData | undefined;
  let simulator: SimulatorData | undefined;

  if (title.toLowerCase().includes('quantum') || docContext.toLowerCase().includes('superposition') || q.includes('quantum') || q.includes('superposition') || q.includes('decoherence')) {
    spoken = `In quantum mechanics, a qubit exists in a linear superposition of zero and one states until measurement. When it interacts with environmental degrees of freedom, decoherence destroys phase relationships. What do you think happens to the interference pattern when phase coherence is lost?`;
    display = `### Quantum State Superposition & Decoherence\n\n- **Superposition:** $|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$ where $|\\alpha|^2 + |\\beta|^2 = 1$.\n- **Measurement:** Induces projective collapse to an eigenstate.\n- **Decoherence:** Thermal and environmental coupling causes non-unitary decay of off-diagonal density matrix elements over characteristic time $T_2$.\n\n*Socratic Question:* How does quantum error correction prevent state loss without violating the No-Cloning theorem?`;
    mindmap = generateMindmapArtifact('Quantum Superposition Hierarchy', docContext);
  } else if (title.toLowerCase().includes('enzyme') || docContext.toLowerCase().includes('michaelis') || q.includes('enzyme') || q.includes('kinetics')) {
    spoken = `Enzyme catalysis depends on the rate at which enzyme and substrate form the intermediate complex versus catalytic turnover. Notice how the Michaelis constant K m represents the substrate concentration at half maximal velocity. How would a competitive inhibitor shift this curve?`;
    display = `### Enzyme Kinetics (Michaelis-Menten Model)\n\n$$v = \\frac{V_{max}[S]}{K_m + [S]}$$\n\n- **$V_{max}$:** Maximal saturation velocity.\n- **$K_m$:** Substrate concentration at $v = \\frac{1}{2}V_{max}$.\n- **$k_{cat}$:** Turnover number measuring catalytic speed.\n\n*Socratic Question:* On a Lineweaver-Burk double-reciprocal plot, what happens to the slope and intercepts when substrate affinity increases?`;
    simulator = generateSimulatorArtifact('Michaelis-Menten Kinetics', docContext);
  } else if (title.toLowerCase().includes('neural') || docContext.toLowerCase().includes('backpropagation') || q.includes('backprop') || q.includes('gradient')) {
    spoken = `Backpropagation uses the multivariate calculus chain rule to distribute the output loss backwards through weight matrices. Gradient descent adjusts weights proportional to the negative partial derivatives. What risk arises when gradients become exponentially small across deep layers?`;
    display = `### Neural Network Backpropagation\n\n$$\\frac{\\partial \\mathcal{L}}{\\partial W^{(l)}} = \\delta^{(l)} (a^{(l-1)})^T$$\n\n- **Forward Pass:** Computes pre-activations $z^{(l)}$ and activations $a^{(l)}$.\n- **Backward Pass:** Propagates error vector $\\delta^{(l)}$ backwards using Jacobians.\n- **Weight Update:** $W \\leftarrow W - \\eta \\nabla_W \\mathcal{L}$.\n\n*Socratic Question:* Why do activation functions like ReLU alleviate vanishing gradient problems compared to Sigmoid?`;
    mindmap = generateMindmapArtifact('Backpropagation Information Flow', docContext);
  } else {
    // General document reasoning
    const cleanDoc = docContext.slice(0, 500).replace(/#/g, '').replace(/\n+/g, ' ').trim();
    spoken = `Looking at ${title}, the central principle focuses on understanding underlying foundational laws and verifying how key variables interact. Let's examine: how would you summarize the core thesis of this section in your own words?`;
    display = `### Conceptual Breakdown: ${title}\n\nBased on your active study notes (Page ${currentPage}):\n\n> *"${cleanDoc.slice(0, 200)}..."*\n\n**Key Takeaways:**\n1. Understanding the primary definitions and theoretical constraints.\n2. Formulating mental models to connect causes with observational effects.\n3. Testing edge cases through quantitative validation.\n\n*Socratic Check:* What is the most critical constraint or assumption this model relies upon?`;
  }

  const note: SocraticNoteData = {
    id: `note-${Date.now()}`,
    headline: `Inquiry on ${title}`,
    noteType: 'takeaway',
    content: display.slice(0, 180) + '...',
    pageNumber: currentPage,
    createdAt: timestamp,
  };

  return {
    spokenReply: spoken,
    displayReply: display,
    mindmap,
    simulator,
    note,
  };
}

export function generateMindmapArtifact(topic: string, context?: string): MindmapData {
  const timestamp = new Date().toISOString();
  const safeTopic = topic || 'Academic Concept';

  if (safeTopic.toLowerCase().includes('quantum') || (context && context.toLowerCase().includes('quantum'))) {
    return {
      id: `mm-${Date.now()}`,
      title: 'Quantum Mechanics Concept Architecture',
      diagramType: 'graph',
      mermaidSyntax: `graph TD
  A[Quantum State |ψ⟩] --> B[Superposition: α|0⟩ + β|1⟩]
  A --> C[Decoherence & Environment]
  B --> D[Wavefunction Collapse]
  B --> E[Interference Effects]
  C --> F[Dephasing T_phi]
  C --> G[Relaxation T_1]
  D --> H[Born Probability Rule]
  E --> I[Constructive Quantum Algorithms]`,
      summary: 'Hierarchical mapping of superposition, collapse, and environmental decoherence channels.',
      createdAt: timestamp,
    };
  }

  if (safeTopic.toLowerCase().includes('enzyme') || (context && context.toLowerCase().includes('enzyme'))) {
    return {
      id: `mm-${Date.now()}`,
      title: 'Enzyme Kinetics Pathway & Regulation',
      diagramType: 'graph',
      mermaidSyntax: `graph TD
  A[Free Enzyme E + Substrate S] -->|k1| B[Enzyme-Substrate Complex ES]
  B -->|k-1| A
  B -->|kcat| C[Enzyme E + Product P]
  B --> D[Michaelis Constant Km]
  D --> E[Substrate Affinity: Low Km = High Affinity]
  C --> F[Turnover Rate Vmax]
  F --> G[Lineweaver-Burk Linearization]`,
      summary: 'Reaction pathways, steady-state equilibria, and kinetic parameter interdependencies.',
      createdAt: timestamp,
    };
  }

  if (safeTopic.toLowerCase().includes('neural') || (context && context.toLowerCase().includes('backprop'))) {
    return {
      id: `mm-${Date.now()}`,
      title: 'Deep Learning Optimization & Backpropagation Graph',
      diagramType: 'graph',
      mermaidSyntax: `graph LR
  X[Input Features X] --> H1[Layer 1 Activations a1]
  H1 --> H2[Layer 2 Activations a2]
  H2 --> Y[Predicted Output y_hat]
  Y --> L[Loss Function L]
  L -.->|Chain Rule dL/da2| H2
  H2 -.->|Weight Gradient dL/dW2| W2[Update Weights W2]
  H2 -.->|Backpropagated Error| H1
  H1 -.->|Weight Gradient dL/dW1| W1[Update Weights W1]`,
      summary: 'Computational graph tracing forward inference and reverse algorithmic gradient propagation.',
      createdAt: timestamp,
    };
  }

  // Default clean conceptual diagram
  return {
    id: `mm-${Date.now()}`,
    title: `${safeTopic} Structure`,
    diagramType: 'graph',
    mermaidSyntax: `graph TD
  A[${safeTopic}] --> B[Foundational Principles]
  A --> C[Mathematical Relationships]
  A --> D[Practical Applications]
  B --> E[Theoretical Axioms]
  B --> F[Boundary Conditions]
  C --> G[Independent Variables]
  C --> H[System Dynamics Output]
  D --> I[Experimental Verification]`,
    summary: `Structured conceptual decomposition of ${safeTopic}.`,
    createdAt: timestamp,
  };
}

export function generateSimulatorArtifact(topic: string, context?: string): SimulatorData {
  const timestamp = new Date().toISOString();
  const safeTopic = topic || 'Physical Model';

  if (safeTopic.toLowerCase().includes('enzyme') || (context && context.toLowerCase().includes('enzyme'))) {
    return {
      id: `sim-${Date.now()}`,
      title: 'Michaelis-Menten Rate Simulator',
      description: 'Explore how substrate concentration [S] and affinity (Km) dictate catalytic velocity v.',
      formula: 'v = (Vmax * [S]) / (Km + [S])',
      variables: [
        { name: 'S', label: 'Substrate [S]', min: 1, max: 100, defaultVal: 20, unit: 'μM', step: 1 },
        { name: 'Vmax', label: 'Max Velocity (Vmax)', min: 10, max: 200, defaultVal: 100, unit: 'μM/s', step: 5 },
        { name: 'Km', label: 'Michaelis Constant (Km)', min: 1, max: 50, defaultVal: 15, unit: 'μM', step: 1 },
      ],
      computeExpression: '(Vmax * S) / (Km + S)',
      outputLabel: 'Reaction Rate (v)',
      outputUnit: 'μM/s',
      explanation: 'When [S] equals Km, the velocity is exactly half of Vmax. At very high [S], the enzyme approaches asymptotic saturation.',
      createdAt: timestamp,
    };
  }

  if (safeTopic.toLowerCase().includes('quantum') || (context && context.toLowerCase().includes('quantum'))) {
    return {
      id: `sim-${Date.now()}`,
      title: 'Quantum Decoherence Lifetime Calculator',
      description: 'Compute effective dephasing timescale T2 based on relaxation T1 and pure dephasing T_phi.',
      formula: '1 / T2 = (1 / (2 * T1)) + (1 / T_phi)',
      variables: [
        { name: 'T1', label: 'Relaxation Time (T1)', min: 10, max: 500, defaultVal: 100, unit: 'μs', step: 5 },
        { name: 'Tphi', label: 'Pure Dephasing (T_phi)', min: 5, max: 200, defaultVal: 40, unit: 'μs', step: 5 },
      ],
      computeExpression: '1 / ((1 / (2 * T1)) + (1 / Tphi))',
      outputLabel: 'Coherence Time (T2)',
      outputUnit: 'μs',
      explanation: 'T2 is strictly bounded by 2 * T1. Increasing thermal environmental shielding increases T_phi and protects quantum superposition.',
      createdAt: timestamp,
    };
  }

  // Default physical force simulator
  return {
    id: `sim-${Date.now()}`,
    title: 'Newtonian Force & Acceleration Model',
    description: 'Calculate net resulting force as a function of body mass and applied acceleration.',
    formula: 'F = m * a',
    variables: [
      { name: 'm', label: 'Mass (m)', min: 1, max: 200, defaultVal: 25, unit: 'kg', step: 1 },
      { name: 'a', label: 'Acceleration (a)', min: 0.1, max: 50, defaultVal: 9.8, unit: 'm/s²', step: 0.1 },
    ],
    computeExpression: 'm * a',
    outputLabel: 'Net Force (F)',
    outputUnit: 'Newtons',
    explanation: 'Force scales linearly with both mass and acceleration according to Newton\'s Second Law.',
    createdAt: timestamp,
  };
}

export function generateQuizArtifact(topic: string, context: string, tier: 'easy' | 'medium' | 'hard' = 'medium'): QuizCardData {
  const timestamp = new Date().toISOString();
  const safeTopic = topic || 'Academic Topic';

  if (safeTopic.toLowerCase().includes('quantum') || context.toLowerCase().includes('quantum')) {
    if (tier === 'hard') {
      return {
        id: `quiz-${Date.now()}`,
        tier: 'hard',
        question: 'Why does quantum error correction rely on syndrome measurements rather than projective measurement of data qubits?',
        options: [
          'Direct measurement collapses the superposition into a classical basis state.',
          'Syndrome measurements generate faster optical pulses.',
          'Classical parity checks require cloning the unknown state vector.',
          'Decoherence timescales are independent of projective operations.',
        ],
        correctIndex: 0,
        explanation: 'Because direct projective measurement projects an unknown linear superposition α|0⟩ + β|1⟩ onto |0⟩ or |1⟩ with probabilities |α|² and |β|², destroying the quantum phase. Syndrome measurements measure ancilla qubits to detect errors without reading the underlying data qubit amplitudes.',
        hint: 'Think about what the Born measurement postulate does to linear superposition.',
        createdAt: timestamp,
      };
    }
    return {
      id: `quiz-${Date.now()}`,
      tier: 'medium',
      question: 'What is the physical meaning of the normalization condition |α|² + |β|² = 1 for a qubit state vector |ψ⟩?',
      options: [
        'Total probability of measuring all possible outcomes must equal 100%.',
        'The qubit can only exist at zero Kelvin temperature.',
        'The relative phase between amplitudes must equal zero.',
        'The particle velocity cannot exceed the speed of light in vacuum.',
      ],
      correctIndex: 0,
      explanation: 'In quantum mechanics, Born\'s rule dictates that |α|² is the probability of collapsing to |0⟩, and |β|² is the probability of collapsing to |1⟩. Since these form an orthonormal basis covering all outcomes, their sum must equal 1.',
      hint: 'Recall Born\'s probability interpretation.',
      createdAt: timestamp,
    };
  }

  if (safeTopic.toLowerCase().includes('enzyme') || context.toLowerCase().includes('enzyme')) {
    return {
      id: `quiz-${Date.now()}`,
      tier: 'medium',
      question: 'What happens to the reaction velocity v when the substrate concentration [S] is equal to the Michaelis constant Km?',
      options: [
        'v = 0.5 * Vmax (half of the maximal velocity)',
        'v reaches asymptotic maximum Vmax',
        'The enzyme denatures completely',
        'v becomes independent of enzyme concentration',
      ],
      correctIndex: 0,
      explanation: 'Plugging [S] = Km into v = (Vmax * [S]) / (Km + [S]) yields v = (Vmax * Km) / (2 * Km) = Vmax / 2.',
      hint: 'Substitute [S] = Km into the Michaelis-Menten rate formula.',
      createdAt: timestamp,
    };
  }

  // Default quiz card
  return {
    id: `quiz-${Date.now()}`,
    tier: tier,
    question: `Which fundamental principle governs the primary dynamics described in ${safeTopic}?`,
    options: [
      'Conservation laws and boundary equilibrium constraints',
      'Unconstrained exponential expansion without feedback',
      'Instantaneous non-causal action across infinite distances',
      'Complete loss of all stored system information',
    ],
    correctIndex: 0,
    explanation: 'Physical, biological, and mathematical systems are universally bounded by conservation laws, boundary conditions, and equilibrium thresholds.',
    hint: 'Think about physical boundary constraints.',
    createdAt: timestamp,
  };
}
