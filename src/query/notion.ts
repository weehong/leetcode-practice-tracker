import { Question, QuestionDetail, TopicTagsProps } from "../types/leetcode.js";
import logger from "../utils/logger.js";

// Utility function to parse text with inline formatting (backticks, bold, italic)
// Process in order: backticks (code) first, then bold, then italic
const parseInlineFormatting = (text: string): any[] => {
  const richTextArray: any[] = [];

  // Step 1: Split by backticks first (code has highest priority)
  const codePattern = /`([^`]+)`/g;
  const segments: Array<{ text: string; isCode: boolean }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codePattern.exec(text)) !== null) {
    // Add text before the code
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
        isCode: false,
      });
    }
    // Add the code segment
    segments.push({ text: match[1], isCode: true });
    lastIndex = match.index + match[0].length;
  }
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex), isCode: false });
  }

  // Step 2: Process each segment for bold and italic (only non-code segments)
  segments.forEach((segment) => {
    if (segment.isCode) {
      // Add code segment as-is
      richTextArray.push({
        type: "text",
        text: { content: segment.text },
        annotations: { code: true },
      });
    } else {
      // Process bold and italic in non-code segments
      // We need to handle nested formatting like **a_bcd_** or *a__bcd__*
      // Strategy: Process character by character, tracking formatting state

      let i = 0;
      const text = segment.text;

      while (i < text.length) {
        // Check for bold with nested italic: **..._..._...**
        if (text.substring(i).match(/^\*\*([^*]*?)_([^_]+?)_([^*]*?)\*\*/)) {
          const match = text
            .substring(i)
            .match(/^\*\*([^*]*?)_([^_]+?)_([^*]*?)\*\*/)!;
          const before = match[1];
          const nested = match[2];
          const after = match[3];

          // Add bold text before nested part
          if (before) {
            richTextArray.push({
              type: "text",
              text: { content: before },
              annotations: { bold: true },
            });
          }

          // Add bold+italic nested part
          richTextArray.push({
            type: "text",
            text: { content: nested },
            annotations: { bold: true, italic: true },
          });

          // Add bold text after nested part
          if (after) {
            richTextArray.push({
              type: "text",
              text: { content: after },
              annotations: { bold: true },
            });
          }

          i += match[0].length;
        }
        // Check for italic with nested bold: *...__...__...*
        else if (text.substring(i).match(/^\*([^*]*?)__([^_]+?)__([^*]*?)\*/)) {
          const match = text
            .substring(i)
            .match(/^\*([^*]*?)__([^_]+?)__([^*]*?)\*/)!;
          const before = match[1];
          const nested = match[2];
          const after = match[3];

          // Add italic text before nested part
          if (before) {
            richTextArray.push({
              type: "text",
              text: { content: before },
              annotations: { italic: true },
            });
          }

          // Add bold+italic nested part
          richTextArray.push({
            type: "text",
            text: { content: nested },
            annotations: { bold: true, italic: true },
          });

          // Add italic text after nested part
          if (after) {
            richTextArray.push({
              type: "text",
              text: { content: after },
              annotations: { italic: true },
            });
          }

          i += match[0].length;
        }
        // Check for simple bold+italic: ***text***, **_text_**, or *__text__*
        else if (
          text
            .substring(i)
            .match(/^(\*\*\*[^*]+?\*\*\*|\*\*_[^_]+?_\*\*|\*__[^_]+?__\*)/)
        ) {
          const match = text
            .substring(i)
            .match(/^(\*\*\*[^*]+?\*\*\*|\*\*_[^_]+?_\*\*|\*__[^_]+?__\*)/)!;
          const matchedText = match[0];
          let content;

          if (matchedText.startsWith("***")) {
            content = matchedText.slice(3, -3);
          } else if (matchedText.startsWith("**_")) {
            content = matchedText.slice(3, -3);
          } else if (matchedText.startsWith("*__")) {
            content = matchedText.slice(3, -3);
          }

          richTextArray.push({
            type: "text",
            text: { content },
            annotations: { bold: true, italic: true },
          });

          i += matchedText.length;
        }
        // Check for bold: **text** or __text__
        else if (text.substring(i).match(/^(\*\*[^*]+?\*\*|__[^_]+?__)/)) {
          const match = text
            .substring(i)
            .match(/^(\*\*[^*]+?\*\*|__[^_]+?__)/)!;
          const matchedText = match[0];
          const content = matchedText.slice(2, -2);

          richTextArray.push({
            type: "text",
            text: { content },
            annotations: { bold: true },
          });

          i += matchedText.length;
        }
        // Check for italic: *text* or _text_
        else if (text.substring(i).match(/^(\*[^*]+?\*|_[^_]+?_)/)) {
          const match = text.substring(i).match(/^(\*[^*]+?\*|_[^_]+?_)/)!;
          const matchedText = match[0];
          const content = matchedText.slice(1, -1);

          richTextArray.push({
            type: "text",
            text: { content },
            annotations: { italic: true },
          });

          i += matchedText.length;
        }
        // Plain text (collect until next formatting marker or end)
        else {
          let plainText = "";
          while (
            i < text.length &&
            !text.substring(i).match(/^(\*\*\*|\*\*|__|_|\*)/)
          ) {
            plainText += text[i];
            i++;
          }

          // If we stopped at a formatting marker but it didn't match any pattern above,
          // it's a stray marker - consume it and add to plain text
          if (i < text.length && text.substring(i).match(/^(\*|_)/)) {
            plainText += text[i];
            i++;
          }

          // Remove any stray asterisks or underscores from plain text
          plainText = plainText.replace(/[\*_]/g, "");

          if (plainText) {
            richTextArray.push({
              type: "text",
              text: { content: plainText },
            });
          }
        }
      }
    }
  });

  return richTextArray.length > 0
    ? richTextArray
    : [{ type: "text", text: { content: text } }];
};

// Utility function to convert HTML content to Notion rich text
export const htmlToNotionRichText = (htmlContent: string): any[] => {
  if (!htmlContent) return [];

  // Basic HTML to rich text conversion
  const plainText = htmlContent
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  if (!plainText) return [];

  return parseInlineFormatting(plainText);
};

// Utility function to convert HTML emphasis tags to simple markdown
const convertEmphasisToMarkdown = (html: string): string => {
  // Convert nested tags to ***text*** (bold+italic)
  html = html.replace(
    /<(strong|b)><(em|i)>(.*?)<\/(em|i)><\/(strong|b)>/g,
    "***$3***"
  );
  html = html.replace(
    /<(em|i)><(strong|b)>(.*?)<\/(strong|b)><\/(em|i)>/g,
    "***$3***"
  );

  // Convert standalone tags
  html = html.replace(/<(strong|b)>/g, "**").replace(/<\/(strong|b)>/g, "**");
  html = html.replace(/<(em|i)>/g, "*").replace(/<\/(em|i)>/g, "*");

  return html;
};

// Utility function to parse HTML with complex nesting directly to Notion rich text
const parseHtmlToRichText = (html: string): any[] => {
  // Remove span tags (but keep their content)
  html = html.replace(/<span[^>]*>/g, "").replace(/<\/span>/g, "");

  // Decode HTML entities
  html = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  const richTextArray: any[] = [];

  // Simple state machine to track formatting
  let currentText = "";
  let isBold = false;
  let isItalic = false;
  let isCode = false;

  let i = 0;
  while (i < html.length) {
    // Check for opening tags
    if (html.substring(i).match(/^<(strong|b)>/)) {
      // Flush current text
      if (currentText) {
        richTextArray.push({
          type: "text",
          text: { content: currentText },
          annotations: {
            ...(isBold && { bold: true }),
            ...(isItalic && { italic: true }),
            ...(isCode && { code: true }),
          },
        });
        currentText = "";
      }
      isBold = true;
      i += html.substring(i).match(/^<(strong|b)>/)![0].length;
    } else if (html.substring(i).match(/^<(em|i)>/)) {
      if (currentText) {
        richTextArray.push({
          type: "text",
          text: { content: currentText },
          annotations: {
            ...(isBold && { bold: true }),
            ...(isItalic && { italic: true }),
            ...(isCode && { code: true }),
          },
        });
        currentText = "";
      }
      isItalic = true;
      i += html.substring(i).match(/^<(em|i)>/)![0].length;
    } else if (html.substring(i).match(/^<code>/)) {
      if (currentText) {
        richTextArray.push({
          type: "text",
          text: { content: currentText },
          annotations: {
            ...(isBold && { bold: true }),
            ...(isItalic && { italic: true }),
            ...(isCode && { code: true }),
          },
        });
        currentText = "";
      }
      isCode = true;
      i += 6; // <code>
    }
    // Check for closing tags
    else if (html.substring(i).match(/^<\/(strong|b)>/)) {
      if (currentText) {
        richTextArray.push({
          type: "text",
          text: { content: currentText },
          annotations: {
            ...(isBold && { bold: true }),
            ...(isItalic && { italic: true }),
            ...(isCode && { code: true }),
          },
        });
        currentText = "";
      }
      isBold = false;
      i += html.substring(i).match(/^<\/(strong|b)>/)![0].length;
    } else if (html.substring(i).match(/^<\/(em|i)>/)) {
      if (currentText) {
        richTextArray.push({
          type: "text",
          text: { content: currentText },
          annotations: {
            ...(isBold && { bold: true }),
            ...(isItalic && { italic: true }),
            ...(isCode && { code: true }),
          },
        });
        currentText = "";
      }
      isItalic = false;
      i += html.substring(i).match(/^<\/(em|i)>/)![0].length;
    } else if (html.substring(i).match(/^<\/code>/)) {
      if (currentText) {
        richTextArray.push({
          type: "text",
          text: { content: currentText },
          annotations: {
            ...(isBold && { bold: true }),
            ...(isItalic && { italic: true }),
            ...(isCode && { code: true }),
          },
        });
        currentText = "";
      }
      isCode = false;
      i += 7; // </code>
    }
    // Regular character
    else {
      currentText += html[i];
      i++;
    }
  }

  // Flush remaining text
  if (currentText) {
    richTextArray.push({
      type: "text",
      text: { content: currentText },
      annotations: {
        ...(isBold && { bold: true }),
        ...(isItalic && { italic: true }),
        ...(isCode && { code: true }),
      },
    });
  }

  return richTextArray.filter((item) => item.text.content.length > 0);
};

// Utility function to parse HTML and extract sections
const parseContentSections = (
  content: string
): {
  description: string;
  descriptionHtml?: string;
  examples: string[];
  constraints: string[];
  followUp: string;
} => {
  logger.debug('parseContentSections: Starting content parsing', {
    contentLength: content.length,
    contentPreview: content.substring(0, 300)
  });

  const sections = {
    description: "",
    descriptionHtml: "" as string | undefined,
    examples: [] as string[],
    constraints: [] as string[],
    followUp: "",
  };

  // Extract examples
  const exampleRegex =
    /<strong class="example">Example \d+:<\/strong><\/p>\s*<pre>([\s\S]*?)<\/pre>/g;
  let match;
  while ((match = exampleRegex.exec(content)) !== null) {
    sections.examples.push(match[1].trim());
  }

  // Extract constraints
  const constraintsMatch = content.match(
    /<strong>Constraints:<\/strong><\/p>\s*<ul>([\s\S]*?)<\/ul>/
  );
  if (constraintsMatch) {
    const constraintItems = constraintsMatch[1].match(/<li>(.*?)<\/li>/g);
    if (constraintItems) {
      sections.constraints = constraintItems.map((item) => {
        let constraint = item
          .replace(/<li>|<\/li>/g, "")
          .replace(/<code>/g, "`")
          .replace(/<\/code>/g, "`")
          .replace(/<sup>/g, "^")
          .replace(/<\/sup>/g, "");

        // Convert emphasis tags to markdown with proper nesting
        constraint = convertEmphasisToMarkdown(constraint);

        return constraint
          .replace(/<[^>]*>/g, "")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ")
          .trim();
      });
    }
  }

  // Extract follow-up
  const followUpMatch = content.match(
    /<strong>Follow-up:&nbsp;<\/strong>([\s\S]*?)(?=<\/p>|$)/
  );
  if (followUpMatch) {
    let followUp = followUpMatch[1]
      .replace(/<code>/g, "`")
      .replace(/<\/code>/g, "`")
      .replace(/<sup>/g, "^")
      .replace(/<\/sup>/g, "");

    // Convert emphasis tags to markdown with proper nesting
    followUp = convertEmphasisToMarkdown(followUp);

    sections.followUp = followUp
      .replace(/<[^>]*>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();
  }

  // Extract main description (everything before examples or constraints)
  let descContent = content;
  const firstExampleIndex = content.indexOf('<strong class="example">Example');
  const constraintsIndex = content.indexOf("<strong>Constraints:</strong>");
  const cutoffIndex = Math.min(
    firstExampleIndex > -1 ? firstExampleIndex : Infinity,
    constraintsIndex > -1 ? constraintsIndex : Infinity
  );

  if (cutoffIndex !== Infinity) {
    descContent = content.substring(0, cutoffIndex);
  }

  // Store the raw HTML description for direct parsing (keep HTML tags intact for block parser)
  sections.descriptionHtml = descContent.trim();

  // Also keep a plain text version for backwards compatibility
  let description = descContent
    .replace(/<p>/g, "\n")
    .replace(/<\/p>/g, "\n")
    .replace(/<code>/g, "`")
    .replace(/<\/code>/g, "`");

  description = convertEmphasisToMarkdown(description);

  sections.description = description
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();

  logger.debug('parseContentSections: Parsing complete', {
    descriptionLength: sections.description.length,
    descriptionHtmlLength: sections.descriptionHtml?.length || 0,
    examplesCount: sections.examples.length,
    constraintsCount: sections.constraints.length,
    hasFollowUp: !!sections.followUp,
    descriptionHtmlPreview: sections.descriptionHtml?.substring(0, 200)
  });

  return sections;
};

// Utility function to parse HTML blocks (paragraphs, lists, etc.) into Notion blocks
const parseHtmlBlocks = (html: string): any[] => {
  const blocks: any[] = [];

  logger.debug('parseHtmlBlocks: Starting HTML parsing', {
    htmlLength: html.length,
    htmlPreview: html.substring(0, 200)
  });

  // Split by paragraph and list boundaries while preserving the tags
  // This regex captures: <p>...</p>, <ul>...</ul>, <ol>...</ol>
  const blockRegex =
    /<p>([\s\S]*?)<\/p>|<ul>([\s\S]*?)<\/ul>|<ol>([\s\S]*?)<\/ol>/g;
  let match;
  let matchCount = 0;

  while ((match = blockRegex.exec(html)) !== null) {
    matchCount++;
    logger.debug(`parseHtmlBlocks: Found match #${matchCount}`, {
      matchType: match[1] ? 'paragraph' : match[2] ? 'ul' : 'ol',
      contentPreview: (match[1] || match[2] || match[3] || '').substring(0, 100)
    });
    if (match[1] !== undefined) {
      // Paragraph block
      const paragraphContent = match[1].trim();
      if (paragraphContent) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: parseHtmlToRichText(paragraphContent),
          },
        });
      }
    } else if (match[2] !== undefined) {
      // Unordered list block
      const listContent = match[2];
      const listItems = listContent.match(/<li>([\s\S]*?)<\/li>/g);
      if (listItems) {
        listItems.forEach((item) => {
          const itemContent = item.replace(/<li>|<\/li>/g, "").trim();
          if (itemContent) {
            blocks.push({
              object: "block",
              type: "bulleted_list_item",
              bulleted_list_item: {
                rich_text: parseHtmlToRichText(itemContent),
              },
            });
          }
        });
      }
    } else if (match[3] !== undefined) {
      // Ordered list block
      const listContent = match[3];
      const listItems = listContent.match(/<li>([\s\S]*?)<\/li>/g);
      if (listItems) {
        listItems.forEach((item) => {
          const itemContent = item.replace(/<li>|<\/li>/g, "").trim();
          if (itemContent) {
            blocks.push({
              object: "block",
              type: "numbered_list_item",
              numbered_list_item: {
                rich_text: parseHtmlToRichText(itemContent),
              },
            });
          }
        });
      }
    }
  }

  logger.debug('parseHtmlBlocks: Parsing complete', {
    totalMatches: matchCount,
    blocksCreated: blocks.length
  });

  if (matchCount === 0) {
    logger.warn('parseHtmlBlocks: No HTML blocks matched! This may indicate a parsing issue.', {
      htmlSample: html.substring(0, 500)
    });
  }

  return blocks;
};

// Utility function to create page content blocks from problem description
export const createProblemDescriptionBlocks = (content: string): any[] => {
  if (!content) {
    logger.warn('createProblemDescriptionBlocks: No content provided');
    return [];
  }

  logger.debug('createProblemDescriptionBlocks: Starting block creation', {
    contentLength: content.length
  });

  const sections = parseContentSections(content);
  const blocks: any[] = [];

  // Add problem description
  if (sections.descriptionHtml) {
    // Use HTML block parser for description to handle lists and complex formatting
    const descriptionBlocks = parseHtmlBlocks(sections.descriptionHtml);
    blocks.push(...descriptionBlocks);
  } else if (sections.description) {
    // Fallback to markdown parser for backwards compatibility
    const paragraphs = sections.description
      .split("\n\n")
      .filter((p) => p.trim());
    paragraphs.forEach((paragraph) => {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: parseInlineFormatting(paragraph.trim()),
        },
      });
    });
  }

  // Add examples section
  if (sections.examples.length > 0) {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "Examples",
            },
          },
        ],
      },
    });

    sections.examples.forEach((example) => {
      const exampleText = example
        .replace(/<strong>/g, "")
        .replace(/<\/strong>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .trim();

      blocks.push({
        object: "block",
        type: "code",
        code: {
          rich_text: [
            {
              type: "text",
              text: {
                content: exampleText,
              },
            },
          ],
          language: "plain text",
        },
      });
    });
  }

  // Add constraints section
  if (sections.constraints.length > 0) {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "Constraints",
            },
          },
        ],
      },
    });

    sections.constraints.forEach((constraint) => {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: parseInlineFormatting(constraint),
        },
      });
    });
  }

  // Add follow-up section
  if (sections.followUp) {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "Follow-up",
            },
          },
        ],
      },
    });

    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: parseInlineFormatting(sections.followUp),
      },
    });
  }

  logger.debug('createProblemDescriptionBlocks: Block creation complete', {
    totalBlocks: blocks.length,
    blockTypes: blocks.map(b => b.type).join(', ')
  });

  if (blocks.length === 0) {
    logger.warn('createProblemDescriptionBlocks: No blocks created! Content may not have been parsed correctly.');
  }

  return blocks;
};

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
      Constraints: {
        name: "Constraints",
        type: "rich_text",
        rich_text: {},
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
  const titleWithBadge = question.paidOnly ? `${question.title} 🔒` : question.title;

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
              content: titleWithBadge,
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
            plain_text: titleWithBadge,
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
      Constraints: {
        type: "rich_text",
        rich_text: question.constraints
          ? htmlToNotionRichText(question.constraints)
          : [],
      },
    },
    children: question.content
      ? createProblemDescriptionBlocks(question.content)
      : [],
    parent: {
      database_id: id,
    },
  };
};

// Enhanced function for adding questions with full content details
export const addLeetCodeQuestionWithContent = (
  id: string,
  question: Question,
  questionDetail?: QuestionDetail
) => {
  const baseQuestion = addLeetCodeQuestion(id, question);

  if (!questionDetail) {
    logger.debug('addLeetCodeQuestionWithContent: No question detail provided', {
      questionTitle: question.title
    });
    return baseQuestion;
  }

  logger.debug('addLeetCodeQuestionWithContent: Processing question detail', {
    questionTitle: question.title,
    hasContent: !!questionDetail.content,
    hasConstraints: !!questionDetail.constraints,
    contentLength: questionDetail.content?.length || 0
  });

  const children = questionDetail.content
    ? createProblemDescriptionBlocks(questionDetail.content)
    : [];

  logger.debug('addLeetCodeQuestionWithContent: Children blocks created', {
    questionTitle: question.title,
    childrenCount: children.length
  });

  // Merge the detailed content into the base question properties and add problem description as children
  return {
    ...baseQuestion,
    properties: {
      ...baseQuestion.properties,
      Constraints: {
        type: "rich_text",
        rich_text: questionDetail.constraints
          ? htmlToNotionRichText(questionDetail.constraints)
          : [],
      },
    },
    children,
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
      Constraints: {
        name: "Constraints",
        type: "rich_text",
        rich_text: {},
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
      Constraints: {
        type: "rich_text",
        rich_text: question.constraints
          ? htmlToNotionRichText(question.constraints)
          : [],
      },
    },
    children: question.content
      ? createProblemDescriptionBlocks(question.content)
      : [],
    parent: {
      database_id: id,
    },
  };
};
