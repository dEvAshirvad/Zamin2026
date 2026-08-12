import path from 'node:path';
import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Simankan API',
      version: '1.0.0',
      description: 'Backend API for Simankan.',
    },
    servers: [
      {
        url: '/',
        description: 'API root (paths include /api/v1 prefix)',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'zamin.session_token',
          description:
            'Session cookie set by better-auth under /api/auth/* (prefix zamin).',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid request payload.' },
                details: { type: 'object', additionalProperties: true },
              },
            },
            requestId: { type: 'string' },
          },
        },
        Phone: {
          type: 'object',
          required: ['countryCode', 'number'],
          properties: {
            countryCode: { type: 'string', example: '+91', default: '+91' },
            number: {
              type: 'string',
              pattern: '^\\d{10}$',
              example: '9876543210',
              description: '10-digit Indian mobile number',
            },
          },
        },
        WorkExperienceEntry: {
          type: 'object',
          required: ['company', 'title', 'achievements'],
          properties: {
            company: { type: 'string', maxLength: 120, example: 'Acme Labs' },
            title: { type: 'string', maxLength: 80, example: 'Software Engineer' },
            type: {
              type: 'string',
              enum: [
                'full_time',
                'part_time',
                'contract',
                'freelance',
                'internship',
              ],
              nullable: true,
              example: 'full_time',
            },
            achievements: {
              type: 'string',
              maxLength: 500,
              example: 'Shipped React redesign that cut checkout drop-off 18%.',
              description:
                'Markdown subset: **bold**, *italic*, <u>underline</u>, - / 1. lists',
            },
            domain: {
              type: 'string',
              maxLength: 80,
              nullable: true,
              example: 'fintech',
            },
            startMonth: { type: 'integer', minimum: 1, maximum: 12, example: 1 },
            startYear: { type: 'integer', minimum: 1980, maximum: 2030, example: 2022 },
            endMonth: { type: 'integer', minimum: 1, maximum: 12, nullable: true },
            endYear: { type: 'integer', minimum: 1980, maximum: 2030, nullable: true },
            isCurrent: { type: 'boolean', example: true },
          },
        },
        EducationEntry: {
          type: 'object',
          required: [
            'qualification',
            'fieldOfStudy',
            'college',
            'graduationYear',
          ],
          properties: {
            qualification: {
              type: 'string',
              enum: [
                '10th',
                '12th',
                'Diploma',
                'Bachelor\'s',
                'Master\'s',
                'MBA',
                'PhD',
                'Other',
              ],
              example: 'Bachelor\'s',
            },
            fieldOfStudy: {
              type: 'string',
              maxLength: 120,
              example: 'Computer Science',
            },
            college: {
              type: 'string',
              maxLength: 200,
              example: 'College of Engineering Pune',
            },
            graduationYear: {
              type: 'integer',
              minimum: 1980,
              maximum: 2027,
              example: 2020,
            },
            isExpected: { type: 'boolean', example: false },
            scoreType: {
              type: 'string',
              enum: ['cgpa', 'percentage'],
              nullable: true,
            },
            score: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              nullable: true,
              example: 8.2,
            },
          },
        },
        ExpectedSalary: {
          type: 'object',
          required: ['minLpa', 'maxLpa'],
          properties: {
            minLpa: { type: 'number', minimum: 2, maximum: 100, example: 12 },
            maxLpa: { type: 'number', minimum: 2, maximum: 100, example: 18 },
          },
        },
        SkillEntry: {
          type: 'object',
          required: ['name', 'proficiency'],
          properties: {
            name: { type: 'string', maxLength: 60, example: 'React' },
            proficiency: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'expert'],
              example: 'advanced',
            },
          },
        },
        SocialEntry: {
          type: 'object',
          required: ['name', 'link'],
          properties: {
            name: {
              type: 'string',
              maxLength: 40,
              example: 'linkedin',
              description: 'Platform label, e.g. linkedin, github, portfolio',
            },
            link: {
              type: 'string',
              format: 'uri',
              maxLength: 500,
              example: 'https://www.linkedin.com/in/alex',
            },
          },
        },
        CandidateProfile: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: 'user_abc123' },
            onboardingStep: {
              oneOf: [
                { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7] },
                { type: 'string', enum: ['complete'] },
              ],
              example: 2,
            },
            completionScore: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              example: 42,
            },
            nextAction: {
              type: 'string',
              description:
                'Highest-impact missing item with score delta, e.g. "Add 2 projects to jump from 65 to 80"',
              example: 'Add 2 projects to jump from 65 to 80',
            },
            cv: {
              type: 'object',
              nullable: true,
              properties: {
                fileName: { type: 'string', example: 'alex-cv.pdf' },
                mimeType: { type: 'string', example: 'application/pdf' },
                uploadedAt: { type: 'string', format: 'date-time' },
              },
            },
            portfolioSourceUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
            },
            photo: {
              type: 'object',
              nullable: true,
              properties: {
                uploaded: { type: 'boolean', example: true },
                source: {
                  type: 'string',
                  enum: ['upload', 'oauth'],
                  description:
                    'oauth = Google/LinkedIn avatar; skip re-upload in onboarding',
                },
                url: {
                  type: 'string',
                  format: 'uri',
                  nullable: true,
                  description: 'Present when source is oauth',
                },
              },
            },
            firstName: { type: 'string', nullable: true, example: 'Alex' },
            lastName: { type: 'string', nullable: true, example: 'Kumar' },
            fullName: { type: 'string', nullable: true, example: 'Alex Kumar' },
            phone: { allOf: [{ $ref: '#/components/schemas/Phone' }], nullable: true },
            city: { type: 'string', nullable: true, example: 'Pune' },
            currentlyEmployed: { type: 'boolean', nullable: true },
            currentCompany: { type: 'string', nullable: true },
            currentJobTitle: { type: 'string', nullable: true },
            jobStatus: {
              type: 'string',
              nullable: true,
              enum: [
                'actively_looking',
                'open_to_opportunities',
                'just_exploring',
                null,
              ],
            },
            gender: {
              type: 'string',
              nullable: true,
              enum: [
                'male',
                'female',
                'non_binary',
                'prefer_not_to_say',
                null,
              ],
            },
            yearsOfExperience: { type: 'number', nullable: true, example: 4 },
            workExperience: {
              type: 'array',
              maxItems: 10,
              items: { $ref: '#/components/schemas/WorkExperienceEntry' },
            },
            jobTypePreferences: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'full_time',
                  'part_time',
                  'contract',
                  'freelance',
                  'internship',
                ],
              },
            },
            workMode: {
              type: 'string',
              nullable: true,
              enum: ['in_office', 'remote', 'hybrid', null],
            },
            preferredLocations: {
              type: 'array',
              maxItems: 5,
              items: { type: 'string' },
              example: ['Pune', 'Bengaluru'],
            },
            noticePeriod: {
              type: 'string',
              nullable: true,
              enum: [
                'immediate',
                'within_15_days',
                '30_days',
                '60_days',
                '90_days',
                'employed_3_plus_months',
                null,
              ],
            },
            expectedSalary: {
              allOf: [{ $ref: '#/components/schemas/ExpectedSalary' }],
              nullable: true,
            },
            preferNotToSaySalary: { type: 'boolean', example: false },
            education: {
              type: 'array',
              maxItems: 4,
              items: { $ref: '#/components/schemas/EducationEntry' },
            },
            skills: {
              type: 'array',
              minItems: 0,
              maxItems: 20,
              items: { $ref: '#/components/schemas/SkillEntry' },
            },
            preferredRoleTitles: {
              type: 'array',
              maxItems: 5,
              items: { type: 'string' },
              example: ['Frontend Developer'],
            },
            headline: {
              type: 'string',
              nullable: true,
              maxLength: 150,
              example: 'Full-Stack Dev · 4 yrs · React + Node',
            },
            about: {
              type: 'string',
              nullable: true,
              maxLength: 2000,
              description:
                'Markdown subset: **bold**, *italic*, <u>underline</u>, - / 1. lists',
              example:
                'Full-stack engineer focused on **React** and *Node*.\n\n- Shipped hiring tools\n- Mentored juniors',
            },
            socials: {
              type: 'array',
              maxItems: 8,
              items: { $ref: '#/components/schemas/SocialEntry' },
            },
            projects: {
              type: 'array',
              maxItems: 5,
              items: { $ref: '#/components/schemas/ProjectEntry' },
            },
            discoverable: {
              type: 'boolean',
              default: false,
              description:
                'Opt-in for future recruiter talent search. Off by default.',
              example: false,
            },
            parseJob: {
              allOf: [{ $ref: '#/components/schemas/ParseJobStatus' }],
              nullable: true,
            },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ParseJobStatus: {
          type: 'object',
          properties: {
            jobId: { type: 'string', example: '1' },
            status: {
              type: 'string',
              enum: ['queued', 'active', 'completed', 'failed'],
            },
            progress: { type: 'integer', minimum: 0, maximum: 100, example: 45 },
            stage: {
              type: 'string',
              example: 'llm',
              description:
                'queued | downloading | extracting | llm | saving | done | retrying',
            },
            parseError: { type: 'string', nullable: true },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ProjectEntry: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', maxLength: 120, example: 'Portfolio site' },
            description: {
              type: 'string',
              maxLength: 800,
              example: 'Personal site built with Next.js',
              description:
                'Markdown subset: **bold**, *italic*, <u>underline</u>, - / 1. lists',
            },
            url: {
              type: 'string',
              format: 'uri',
              example: 'https://alex.dev',
            },
            skills: {
              type: 'array',
              maxItems: 10,
              items: { type: 'string' },
              example: ['Next.js', 'TypeScript'],
            },
          },
        },
        CandidateProfileEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/CandidateProfile' },
            requestId: { type: 'string' },
          },
        },
        CandidateSourceEnqueueResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                jobId: { type: 'string', example: '1' },
                status: { type: 'string', enum: ['queued'], example: 'queued' },
                progress: { type: 'integer', example: 0 },
                stage: { type: 'string', example: 'queued' },
                profile: { $ref: '#/components/schemas/CandidateProfile' },
              },
            },
            requestId: { type: 'string' },
          },
        },
        CandidateParseJobResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                jobId: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['queued', 'active', 'completed', 'failed'],
                },
                progress: { type: 'integer', minimum: 0, maximum: 100 },
                stage: { type: 'string' },
                parseError: { type: 'string', nullable: true },
                profile: {
                  allOf: [{ $ref: '#/components/schemas/CandidateProfile' }],
                  nullable: true,
                  description: 'Present when completed or failed',
                },
              },
            },
            requestId: { type: 'string' },
          },
        },
        MetaListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Pune', 'Mumbai'],
                },
              },
            },
            requestId: { type: 'string' },
          },
        },
        PortfolioSourceBody: {
          type: 'object',
          required: ['portfolioUrl'],
          properties: {
            portfolioUrl: {
              type: 'string',
              format: 'uri',
              maxLength: 500,
              example: 'https://alex.dev',
            },
          },
        },
        BasicsBody: {
          type: 'object',
          required: ['fullName', 'phone', 'city'],
          properties: {
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 80,
              example: 'Alex',
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 80,
              example: 'Kumar',
            },
            fullName: {
              type: 'string',
              minLength: 2,
              maxLength: 80,
              example: 'Alex Kumar',
              description: 'Letters, spaces, apostrophe, period, hyphen only',
            },
            phone: { $ref: '#/components/schemas/Phone' },
            city: {
              type: 'string',
              minLength: 2,
              maxLength: 80,
              example: 'Pune',
            },
            headline: {
              type: 'string',
              maxLength: 150,
              example: 'Full-Stack Dev · React + Node',
            },
            about: {
              type: 'string',
              maxLength: 2000,
              description:
                'Markdown subset: **bold**, *italic*, <u>underline</u>, - / 1. lists',
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'non_binary', 'prefer_not_to_say'],
            },
          },
        },
        PreferencesBody: {
          type: 'object',
          required: [
            'jobTypePreferences',
            'workMode',
            'noticePeriod',
            'preferredRoleTitles',
          ],
          properties: {
            jobTypePreferences: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'string',
                enum: [
                  'full_time',
                  'part_time',
                  'contract',
                  'freelance',
                  'internship',
                ],
              },
              example: ['full_time'],
            },
            workMode: {
              type: 'string',
              enum: ['in_office', 'remote', 'hybrid'],
              example: 'hybrid',
            },
            preferredLocations: {
              type: 'array',
              maxItems: 5,
              default: [],
              items: { type: 'string' },
              example: ['Pune', 'Bengaluru'],
              description: 'Cleared server-side when workMode is remote',
            },
            noticePeriod: {
              type: 'string',
              enum: [
                'immediate',
                'within_15_days',
                '30_days',
                '60_days',
                '90_days',
                'employed_3_plus_months',
              ],
              example: '30_days',
            },
            preferredRoleTitles: {
              type: 'array',
              minItems: 1,
              maxItems: 5,
              items: { type: 'string', maxLength: 80 },
              example: ['Frontend Developer'],
            },
            expectedSalary: {
              allOf: [{ $ref: '#/components/schemas/ExpectedSalary' }],
              nullable: true,
              description: 'Optional drip field; omit or preferNotToSaySalary',
            },
            preferNotToSaySalary: { type: 'boolean', example: true },
          },
        },
        EducationBody: {
          type: 'object',
          required: ['education'],
          properties: {
            education: {
              type: 'array',
              minItems: 1,
              maxItems: 4,
              items: { $ref: '#/components/schemas/EducationEntry' },
            },
          },
        },
        ExperienceBody: {
          type: 'object',
          required: ['currentlyEmployed'],
          properties: {
            currentlyEmployed: { type: 'boolean', example: true },
            currentCompany: {
              type: 'string',
              maxLength: 120,
              example: 'Acme Labs',
              description: 'Required when currentlyEmployed is true',
            },
            currentJobTitle: {
              type: 'string',
              maxLength: 80,
              example: 'Software Engineer',
              description: 'Required when currentlyEmployed is true',
            },
            jobStatus: {
              type: 'string',
              enum: [
                'actively_looking',
                'open_to_opportunities',
                'just_exploring',
              ],
              description: 'Required when currentlyEmployed is false',
            },
            yearsOfExperience: {
              type: 'number',
              minimum: 0,
              maximum: 40,
              example: 4,
              description:
                'Optional/ignored — server derives from workExperience date ranges',
            },
            workExperience: {
              type: 'array',
              maxItems: 10,
              default: [],
              items: { $ref: '#/components/schemas/WorkExperienceEntry' },
            },
            discoverable: {
              type: 'boolean',
              example: false,
              description: 'Optional; default false',
            },
          },
        },
        SkillsBody: {
          type: 'object',
          required: ['skills'],
          properties: {
            skills: {
              type: 'array',
              minItems: 3,
              maxItems: 20,
              items: { $ref: '#/components/schemas/SkillEntry' },
              example: [
                { name: 'React', proficiency: 'advanced' },
                { name: 'TypeScript', proficiency: 'intermediate' },
                { name: 'Node.js', proficiency: 'intermediate' },
              ],
            },
            socials: {
              type: 'array',
              maxItems: 8,
              default: [],
              items: { $ref: '#/components/schemas/SocialEntry' },
              example: [
                {
                  name: 'linkedin',
                  link: 'https://www.linkedin.com/in/alex',
                },
              ],
            },
          },
        },
        EnhanceBody: {
          type: 'object',
          required: ['fieldPath', 'text'],
          properties: {
            fieldPath: {
              type: 'string',
              maxLength: 80,
              example: 'headline',
              description: 'Logical field key FE is enhancing (e.g. headline)',
            },
            text: {
              type: 'string',
              minLength: 1,
              maxLength: 8000,
              example: 'dev with react',
            },
          },
        },
        EnhanceResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                before: { type: 'string', example: 'dev with react' },
                after: {
                  type: 'string',
                  example: 'React developer focused on product UI',
                },
              },
            },
            requestId: { type: 'string' },
          },
        },
        SkillSuggestionsBody: {
          type: 'object',
          properties: {
            jobTitle: {
              type: 'string',
              maxLength: 80,
              example: 'Frontend Developer',
            },
            skills: {
              type: 'array',
              maxItems: 20,
              default: [],
              items: { type: 'string' },
              example: ['React'],
            },
          },
        },
        SkillSuggestionsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['TypeScript', 'Next.js', 'CSS'],
                },
              },
            },
            requestId: { type: 'string' },
          },
        },
        ProjectsBody: {
          type: 'object',
          required: ['projects'],
          properties: {
            projects: {
              type: 'array',
              maxItems: 5,
              items: { $ref: '#/components/schemas/ProjectEntry' },
            },
          },
        },
        DiscoveryBody: {
          type: 'object',
          required: ['discoverable'],
          properties: {
            discoverable: {
              type: 'boolean',
              example: true,
              description: 'Opt into in-system discovery (default false)',
            },
          },
        },
        OrgRole: {
          type: 'string',
          enum: ['owner', 'admin', 'member', 'interviewer', 'observer'],
          description:
            'Organization membership role. owner=creator; admin=manage jobs/drives/members; member=own jobs/drives; interviewer=score; observer=proctor.',
        },
        CompanyPublic: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            organizationId: { type: 'string' },
            name: { type: 'string', example: 'Acme Labs' },
            slug: { type: 'string', example: 'acme-labs' },
            domain: { type: 'string', nullable: true, example: 'acme.in' },
            logo: {
              type: 'object',
              nullable: true,
              properties: { uploaded: { type: 'boolean' } },
            },
            industry: {
              type: 'string',
              enum: [
                'Technology',
                'E-commerce',
                'Finance',
                'Healthcare',
                'Education',
                'Media',
                'Manufacturing',
                'FMCG',
                'Consulting',
                'Other',
              ],
            },
            size: {
              type: 'string',
              enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
            },
            website: { type: 'string', format: 'uri', nullable: true },
            hqCity: { type: 'string', example: 'Bengaluru' },
            oneLiner: { type: 'string', nullable: true, maxLength: 200 },
            cultureTags: {
              type: 'array',
              maxItems: 5,
              items: { type: 'string' },
            },
            verificationStatus: {
              type: 'string',
              enum: ['verified', 'unverified'],
            },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CompanyPersonalBody: {
          type: 'object',
          required: ['fullName', 'phone', 'jobTitle'],
          properties: {
            fullName: { type: 'string', minLength: 2, maxLength: 80 },
            phone: { $ref: '#/components/schemas/Phone' },
            jobTitle: { type: 'string', minLength: 2, maxLength: 80 },
          },
        },
        CompanyCreateBody: {
          type: 'object',
          required: ['name', 'industry', 'size', 'hqCity'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 120 },
            industry: {
              type: 'string',
              enum: [
                'Technology',
                'E-commerce',
                'Finance',
                'Healthcare',
                'Education',
                'Media',
                'Manufacturing',
                'FMCG',
                'Consulting',
                'Other',
              ],
            },
            size: {
              type: 'string',
              enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
            },
            hqCity: { type: 'string' },
            website: { type: 'string', format: 'uri', nullable: true },
            oneLiner: { type: 'string', maxLength: 200, nullable: true },
            cultureTags: {
              type: 'array',
              maxItems: 5,
              items: {
                type: 'string',
                enum: [
                  'Remote-friendly',
                  'Fast-paced',
                  'Startup',
                  'Well-funded',
                  'Work-life balance',
                  'Diverse team',
                  'Learning-focused',
                ],
              },
            },
            logoUrl: { type: 'string', format: 'uri', nullable: true },
          },
        },
        CompanyHiringBody: {
          type: 'object',
          required: ['rolesHiredFor', 'experienceLevels', 'hiringFrequency'],
          properties: {
            rolesHiredFor: {
              type: 'array',
              minItems: 1,
              maxItems: 5,
              items: { type: 'string' },
            },
            experienceLevels: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'string',
                enum: ['fresher', 'junior', 'mid', 'senior', 'lead', 'c_suite'],
              },
            },
            hiringFrequency: {
              type: 'string',
              enum: ['continuously', 'monthly', 'quarterly', 'occasionally'],
            },
            hearAboutUs: {
              type: 'string',
              nullable: true,
              enum: [
                'linkedin',
                'friend',
                'google',
                'job_fair',
                'email',
                'other',
              ],
            },
          },
        },
        CompanyOnboarding: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            onboardingStep: {
              oneOf: [
                { type: 'integer', enum: [1, 2, 3] },
                { type: 'string', enum: ['complete'] },
              ],
            },
            fullName: { type: 'string', nullable: true },
            photo: {
              type: 'object',
              nullable: true,
              properties: {
                uploaded: { type: 'boolean' },
                source: { type: 'string', enum: ['upload', 'oauth'] },
                url: { type: 'string', format: 'uri', nullable: true },
              },
            },
            phone: {
              allOf: [{ $ref: '#/components/schemas/Phone' }],
              nullable: true,
            },
            jobTitle: { type: 'string', nullable: true },
            workEmail: { type: 'string', format: 'email', nullable: true },
            companyId: { type: 'string', nullable: true },
            rolesHiredFor: { type: 'array', items: { type: 'string' } },
            experienceLevels: { type: 'array', items: { type: 'string' } },
            hiringFrequency: { type: 'string', nullable: true },
            hearAboutUs: { type: 'string', nullable: true },
            company: {
              allOf: [{ $ref: '#/components/schemas/CompanyPublic' }],
              nullable: true,
            },
            orgRole: {
              allOf: [{ $ref: '#/components/schemas/OrgRole' }],
              nullable: true,
            },
            emailDomainIsFree: { type: 'boolean' },
            emailLocked: { type: 'boolean' },
            detectedCompanyName: { type: 'string', nullable: true },
            suggestedWebsite: { type: 'string', nullable: true },
            suggestedIndustry: { type: 'string', nullable: true },
            existingCompany: {
              allOf: [{ $ref: '#/components/schemas/CompanyPublic' }],
              nullable: true,
            },
            oauthName: { type: 'string', nullable: true },
            oauthImage: { type: 'string', nullable: true },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CompanyOnboardingEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/CompanyOnboarding' },
            requestId: { type: 'string' },
          },
        },
        CompanyMetaEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                catalog: { type: 'string' },
                items: { type: 'array', items: { type: 'string' } },
              },
            },
            requestId: { type: 'string' },
          },
        },
        CompanySearchEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      source: { type: 'string', enum: ['seed', 'platform'] },
                      id: { type: 'string', nullable: true },
                      name: { type: 'string' },
                      domain: { type: 'string', nullable: true },
                      industry: { type: 'string' },
                      verificationStatus: {
                        type: 'string',
                        nullable: true,
                      },
                    },
                  },
                },
              },
            },
            requestId: { type: 'string' },
          },
        },
        CompanyLogoSuggestEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                domain: { type: 'string' },
                logoUrl: { type: 'string', nullable: true },
              },
            },
            requestId: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [path.resolve(process.cwd(), 'src/modules/**/*.ts')],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
