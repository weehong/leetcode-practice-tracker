import { Question, TopicTagsProps } from "../types/leetcode.js";

export const createLeetCodeQuestionDatabase = (id: string) => {
  return {
    properties: {
      Tag: {
        name: "Tag",
        type: "multi_select",
        multi_select: {
          options: [],
        },
      },
      Progress: {
        name: "Progress",
        type: "select",
        select: {
          options: [],
        },
      },
      Difficulty: {
        name: "Difficulty",
        type: "select",
        select: {
          options: [],
        },
      },
      Frequency: {
        name: "Frequency",
        type: "number",
        number: {
          format: "number",
        },
      },
      No: {
        name: "No",
        type: "number",
        number: {
          format: "number",
        },
      },
      Name: {
        name: "Name",
        type: "title",
        title: {},
      },
      "Featured List": {
        name: "Featured List",
        type: "multi_select",
        multi_select: {
          options: [],
        },
      },
      Completed: {
        name: "Completed",
        type: "checkbox",
        checkbox: {},
      },
      "Completion Date": {
        name: "Completion Date",
        type: "formula",
        formula: {
          expression:
            '(prop("Completed") == true) ? now() : fromTimestamp(toNumber(""))',
        },
      },
    },
    title: [
      {
        type: "text",
        text: {
          content: "LeetCode Question",
          link: null,
        },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "LeetCode Question",
        href: null,
      },
    ],
    icon: {
      type: "external",
      external: {
        url: "https://img.icons8.com/external-tal-revivo-shadow-tal-revivo/344/external-level-up-your-coding-skills-and-quickly-land-a-job-logo-shadow-tal-revivo.png",
      },
    },
    parent: {
      type: "page_id",
      page_id: id,
    },
  };
};


export const addLeetCodeQuestion = (id: string, question: Question) => {
  return {
    properties: {
      No: {
        type: "number",
        number: parseInt(question.frontendQuestionId),
      },
      Name: {
        id: "title",
        type: "title",
        title: [
          {
            type: "text",
            text: {
              content: question.title,
              link: {
                url: `https://leetcode.com/problems/${question.titleSlug}`,
              },
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: question.title,
            href: `https://leetcode.com/problems/${question.titleSlug}`,
          },
        ],
      },
      Difficulty: {
        select: {
          name: question.difficulty,
        },
      },
      Progress: {
        type: "select",
        select: null,
      },
      Frequency: {
        type: "number",
        number: question.freqBar ? parseFloat(question.freqBar.toFixed(2)) : 0,
      },
      Tag: {
        type: "multi_select",
        multi_select: question.topicTags.map((tag: TopicTagsProps) => {
          return {
            name: tag.name,
          };
        }),
      },
      "Featured List": {
        type: "multi_select",
        multi_select: question.featuredList
          ? JSON.parse(question.featuredList).map((list: string) => {
            return {
              name: list,
            };
          })
          : [],
      },
    },
    parent: {
      database_id: id,
    },
  };
};


export const createGrindDatabase = (id: string) => {
  return {
    properties: {
      Week: {
        name: "Week",
        type: "select",
        select: {
          options: [],
        },
      },
      Category: {
        name: "Category",
        type: "select",
        select: {
          options: [],
        },
      },
      "Completion Date": {
        name: "Completion Date",
        type: "formula",
        formula: {
          expression:
            '(prop("Completed") == true) ? now() : fromTimestamp(toNumber(""))',
        },
      },
      Completed: {
        name: "Completed",
        type: "checkbox",
        checkbox: {},
      },
      Name: {
        id: "title",
        name: "Name",
        type: "title",
        title: {},
      },
      Difficulty: {
        name: "Difficulty",
        type: "select",
        select: {
          options: [],
        },
      },
    },
    title: [
      {
        type: "text",
        text: {
          content: `Grind 75 Questions`,
          link: null,
        },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: "Grind 75 Questions",
        href: null,
      },
    ],
    icon: {
      type: "external",
      external: {
        url: "https://img.icons8.com/external-tal-revivo-shadow-tal-revivo/344/external-level-up-your-coding-skills-and-quickly-land-a-job-logo-shadow-tal-revivo.png",
      },
    },
    parent: {
      type: "page_id",
      page_id: id,
    },
  };
};

export const addGrindQuestion = (id: string, question: any) => {
  return {
    properties: {
      Week: {
        select: {
          name: question.week,
        },
      },
      Category: {
        select: {
          name: question.category,
        },
      },
      Name: {
        id: "title",
        type: "title",
        title: [
          {
            type: "text",
            text: {
              content: question.title,
              link: {
                url: question.url,
              },
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: question.title,
            href: question.url,
          },
        ],
      },
      Difficulty: {
        select: {
          name: question.difficulty,
        },
      },
    },
    parent: {
      database_id: id,
    },
  };
};
