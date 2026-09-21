import type {Locale} from './locales'

type ExperienceItem = {
  period: string
  company: string
  role: string
  bullets: string[]
}

type Project = {
  label: string
  name: string
  role: string
  description: string
  bullets: string[]
  status?: string
  link: string
  linkLabel: string
}

export type PortfolioCopy = {
  title: string
  description: string
  eyebrow: string
  role: string
  intro: string
  primaryAction: string
  secondaryAction: string
  downloadCvLabel: string
  summary: Array<{label: string; value: string}>
  experience: {
    title: string
    intro: string
    items: ExperienceItem[]
  }
  education: {
    title: string
    intro: string
    label: string
    degree: string
    specialization: string
    institution: string
  }
  projects: {
    title: string
    intro: string
    items: Project[]
  }
  contact: {
    title: string
    label: string
    intro: string
    emailLabel: string
    linkedinLabel: string
    linkedinAriaLabel: string
    formTitle: string
    nameLabel: string
    emailFieldLabel: string
    messageLabel: string
    privacyLabel: string
    submitLabel: string
    networkError: string
  }
}

export const portfolio = {
  es: {
    title: 'Guillermo Anta Alonso — Senior Backend Engineer / Tech Lead',
    description: 'Portfolio de Guillermo Anta Alonso, Senior Backend Engineer y Tech Lead.',
    eyebrow: 'Ingeniería de software · Valladolid, España',
    role: 'Senior Backend Engineer / Tech Lead',
    intro:
      'Ingeniero de software con más de 7 años de experiencia en backend, arquitecturas cloud y entrega de extremo a extremo. Trabajo principalmente con TypeScript, Node.js, Java y Spring.',
    primaryAction: 'Ver experiencia',
    secondaryAction: 'Hablemos',
    downloadCvLabel: 'Descargar CV',
    summary: [
      {label: 'Especialidad', value: 'Backend · Cloud · Tech Lead'},
      {label: 'Experiencia', value: '7+ años'},
      {label: 'Idiomas', value: 'Español · Inglés B2/C1'},
      {label: 'Contacto', value: 'Email'},
    ],
    experience: {
      title: 'Experiencia laboral',
      intro: 'Arquitecturas distribuidas, equipos backend y productos que tienen que funcionar en producción.',
      items: [
        {
          period: 'Ago 2026 — Actualidad',
          company: 'rebAI, S.L.',
          role: 'Technical Lead / Software Architect — AI-Assisted & Agentic Software Engineering',
          bullets: [
            'Liderazgo técnico en la reingeniería y modernización de plataformas legacy.',
            'Diseño de flujos de ingeniería de software asistida por IA y workflows agentic con orquestación multiagente.',
            'Aplicación de análisis de código basado en LLM, inteligencia de codebase, revisión automática y testing asistido por IA.',
            'Diseño de prompts e instrucciones, sistemas human-in-the-loop y guardrails para preservar el control humano y la calidad de ingeniería.',
            'Definición de evaluaciones y quality gates para detectar regresiones y sostener entregas fiables.',
          ],
        },
        {
          period: 'Sep 2025 – Ago 2026',
          company: 'The Phone House Spain, S.L.',
          role: 'Senior Backend Engineer',
          bullets: [
            'Diseño y desarrollo de una nueva arquitectura basada en microservicios Java.',
            'Diseño y desarrollo de una aplicación interna de gestión de tickets.',
            'Tecnologías: Spring, Java, PostgreSQL/MariaDB, AWS, Terraform y Docker.',
            'Logro: reemplazo de una herramienta externa de ticketing, ahorrando más de 100 licencias al año.',
          ],
        },
        {
          period: 'Sep 2021 – Sep 2025',
          company: 'The Telecom Boutique, S.L.',
          role: 'Senior Backend Engineer / Tech Lead',
          bullets: [
            'Dirección de un equipo de 5 desarrolladores.',
            'Lideré la migración de más de 2.500 lambdas JavaScript a una arquitectura hexagonal basada en microservicios TypeScript.',
            'Implementación de buenas prácticas, CI/CD, testing y mejora de flujos de despliegue.',
            'Diseño técnico, gestión de backlog, revisiones de código y coordinación con infraestructura, proveedores y clientes.',
            'Resultados: reducción de costes AWS de 40.000 €/mes a menos de 10.000 €/mes; servicio de generación documental de más de 60.000 documentos diarios.',
          ],
        },
        {
          period: 'Ago 2020 – Sep 2021',
          company: 'Esker Ibérica, S.L.',
          role: 'Software Engineer',
          bullets: [
            'Desarrollo de herramientas de automatización documental usando motores OCR y redes neuronales.',
            'Desarrollo backend con JavaScript en Azure y colaboración continua con equipos internacionales.',
          ],
        },
        {
          period: 'Oct 2019 – Jul 2020',
          company: 'HP Printing and Computing Solutions S.L.U.',
          role: 'Full Stack Developer',
          bullets: [
            'Único desarrollador de una aplicación en tiempo real para gestionar equipos conectados en red.',
            'Responsable del ciclo completo: requisitos, desarrollo, despliegue y mantenimiento.',
            'Tecnologías: Vue, JavaScript, Node.js, Express, Socket.io y MongoDB.',
          ],
        },
        {
          period: 'Abr 2018 – Sep 2019',
          company: 'Silver Storm Solutions, S.L.',
          role: 'Software Engineer',
          bullets: [
            'Desarrollo de un CRM cloud con Angular, JavaScript y MariaDB.',
            'Implementación de integraciones con Jira, SharePoint y plataformas similares.',
          ],
        },
      ],
    },
    education: {
      title: 'Estudios',
      intro: 'Formación académica que sustenta mi trabajo en ingeniería de software.',
      label: 'Titulación',
      degree: 'Graduado en Ingeniería Informática',
      specialization: 'Especializado en Ingeniería de software.',
      institution: 'Universidad de Valladolid (España).',
    },
    projects: {
      title: 'Proyectos',
      intro: 'Productos propios y decisiones técnicas explicadas con contexto.',
      items: [
        {
          label: 'Proyecto personal',
          name: 'Nupzi',
          role: 'Fundador',
          description:
            'Plataforma para crear y gestionar páginas web de boda personalizables. Un producto propio para resolver invitaciones, confirmaciones, recordatorios y galerías desde un mismo lugar.',
          bullets: [
            'Tecnologías: Astro · React · TypeScript · Tailwind CSS · Fastify · MongoDB · Stripe · AWS · Docker · Terraform · Playwright',
            'Invitación digital y formulario de confirmación',
            'Recordatorios y galerías de imágenes',
          ],
          status: 'Beta',
          link: 'https://www.nupzi.com',
          linkLabel: 'Visitar nupzi.com',
        },
        {
          label: 'Proyecto personal',
          name: 'Home Server',
          role: 'Infraestructura doméstica',
          description:
            'Conversión de un portátil Mac de 2014 en un home server con Ubuntu Server y Docker para servicios de red, monitorización y administración doméstica.',
          bullets: [
            'Servicios: Pi-hole · Portainer · Uptime Kuma · Netdata',
            'Red local con DNS filtrante, alertas y métricas del sistema',
            'Objetivo: estabilizar, documentar y recuperar la infraestructura con seguridad',
          ],
          link: '/es/blog/home-server/',
          linkLabel: 'Leer artículo',
        },
      ],
    },
    contact: {
      title: '¿Hablamos?',
      label: 'Contacto',
      intro: 'Cuéntame qué estás construyendo, qué problema quieres resolver o qué equipo necesita refuerzo backend.',
      emailLabel: 'guillermoantataz@gmail.com',
      linkedinLabel: 'LinkedIn',
      linkedinAriaLabel: 'LinkedIn de Guillermo Anta Alonso',
      formTitle: 'Escríbeme directamente',
      nameLabel: 'Nombre',
      emailFieldLabel: 'Email',
      messageLabel: 'Mensaje',
      privacyLabel: 'He leído el aviso de privacidad y acepto el tratamiento de esta consulta.',
      submitLabel: 'Enviar mensaje',
      networkError: 'No se ha podido confirmar la entrega. Inténtalo de nuevo o usa el enlace de email.',
    },
  },
  en: {
    title: 'Guillermo Anta Alonso — Senior Backend Engineer / Tech Lead',
    description: 'Portfolio of Guillermo Anta Alonso, Senior Backend Engineer and Tech Lead.',
    eyebrow: 'Software engineering · Valladolid, Spain',
    role: 'Senior Backend Engineer / Tech Lead',
    intro:
      'Software engineer with more than 7 years of experience in backend systems, cloud architectures and end-to-end delivery. I work mainly with TypeScript, Node.js, Java and Spring.',
    primaryAction: 'View experience',
    secondaryAction: "Let's talk",
    downloadCvLabel: 'Download CV',
    summary: [
      {label: 'Focus', value: 'Backend · Cloud · Tech Lead'},
      {label: 'Experience', value: '7+ years'},
      {label: 'Languages', value: 'Spanish · English B2/C1'},
      {label: 'Contact', value: 'Email'},
    ],
    experience: {
      title: 'Work experience',
      intro: 'Distributed architectures, backend teams and products that have to work in production.',
      items: [
        {
          period: 'Aug 2026 — Present',
          company: 'rebAI, S.L.',
          role: 'Technical Lead / Software Architect — AI-Assisted & Agentic Software Engineering',
          bullets: [
            'Technical leadership in the re-engineering and modernization of legacy platforms.',
            'Designed AI-assisted software engineering and agentic workflows with multi-agent orchestration.',
            'Applied LLM-based code analysis, codebase intelligence, automated code review and AI-assisted testing.',
            'Designed prompts and instructions, human-in-the-loop systems and guardrails to preserve human control and engineering quality.',
            'Defined evaluations and quality gates to detect regressions and support reliable delivery.',
          ],
        },
        {
          period: 'Sep 2025 – Aug 2026',
          company: 'The Phone House Spain, S.L.',
          role: 'Senior Backend Engineer',
          bullets: [
            'Designed and developed a new architecture based on Java microservices.',
            'Designed and developed an internal ticket management application.',
            'Technologies: Spring, Java, PostgreSQL/MariaDB, AWS, Terraform and Docker.',
            'Achievement: replaced an external ticketing tool, saving more than 100 licenses per year.',
          ],
        },
        {
          period: 'Sep 2021 – Sep 2025',
          company: 'The Telecom Boutique, S.L.',
          role: 'Senior Backend Engineer / Tech Lead',
          bullets: [
            'Led a team of 5 developers.',
            'Led the migration of more than 2,500 JavaScript lambdas to a TypeScript microservices architecture based on hexagonal principles.',
            'Implemented engineering practices, CI/CD pipelines, testing and improved deployment workflows.',
            'Technical design, backlog management, code reviews and coordination with infrastructure, vendors and client technical teams.',
            'Results: reduced AWS costs from €40,000/month to less than €10,000/month; built a document generation service processing more than 60,000 documents per day.',
          ],
        },
        {
          period: 'Aug 2020 – Sep 2021',
          company: 'Esker Ibérica, S.L.',
          role: 'Software Engineer',
          bullets: [
            'Developed document automation tools using OCR engines and neural networks.',
            'Backend development with JavaScript on Azure and continuous collaboration with international teams.',
          ],
        },
        {
          period: 'Oct 2019 – Jul 2020',
          company: 'HP Printing and Computing Solutions S.L.U.',
          role: 'Full Stack Developer',
          bullets: [
            'Sole developer of a real-time application for managing network-connected equipment.',
            'Owned the full lifecycle: requirements, development, deployment and maintenance.',
            'Technologies: Vue, JavaScript, Node.js, Express, Socket.io and MongoDB.',
          ],
        },
        {
          period: 'Apr 2018 – Sep 2019',
          company: 'Silver Storm Solutions, S.L.',
          role: 'Software Engineer',
          bullets: [
            'Developed a cloud CRM with Angular, JavaScript and MariaDB.',
            'Implemented integrations with Jira, SharePoint and similar platforms.',
          ],
        },
      ],
    },
    education: {
      title: 'Education',
      intro: 'Academic background supporting my work in software engineering.',
      label: 'Degree',
      degree: 'Graduate in Computer Engineering',
      specialization: 'Specialized in Software Engineering.',
      institution: 'University of Valladolid (Spain).',
    },
    projects: {
      title: 'Projects',
      intro: 'Personal projects and the technical decisions behind them.',
      items: [
        {
          label: 'Personal project',
          name: 'Nupzi',
          role: 'Founder',
          description:
            'A platform for creating and managing customizable wedding websites. A product built to handle invitations, RSVPs, reminders and galleries in one place.',
          bullets: [
            'Technologies: Astro · React · TypeScript · Tailwind CSS · Fastify · MongoDB · Stripe · AWS · Docker · Terraform · Playwright',
            'Digital invitation and RSVP form',
            'Reminders and image galleries',
          ],
          status: 'Beta',
          link: 'https://www.nupzi.com',
          linkLabel: 'Visit nupzi.com',
        },
        {
          label: 'Personal project',
          name: 'Home Server',
          role: 'Home infrastructure',
          description:
            'Turning a 2014 Mac laptop into a home server with Ubuntu Server and Docker for networking, monitoring and home administration services.',
          bullets: [
            'Services: Pi-hole · Portainer · Uptime Kuma · Netdata',
            'Local network with filtered DNS, alerts and system metrics',
            'Goal: stabilize, document and securely recover the infrastructure',
          ],
          link: '/en/blog/home-server/',
          linkLabel: 'Read article',
        },
      ],
    },
    contact: {
      title: "Let's talk",
      label: 'Contact',
      intro: 'Tell me what you are building, what problem you want to solve or where your backend team needs support.',
      emailLabel: 'guillermoantataz@gmail.com',
      linkedinLabel: 'LinkedIn',
      linkedinAriaLabel: 'LinkedIn profile of Guillermo Anta Alonso',
      formTitle: 'Write to me directly',
      nameLabel: 'Name',
      emailFieldLabel: 'Email',
      messageLabel: 'Message',
      privacyLabel: 'I have read the privacy notice and accept the processing of this enquiry.',
      submitLabel: 'Send message',
      networkError: 'Unable to confirm delivery. Please try again or use the email link.',
    },
  },
} satisfies Record<Locale, PortfolioCopy>
