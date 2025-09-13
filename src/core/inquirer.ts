import inquirer from "inquirer";

class Inquirer {
  constructor() {}

  start = async () =>
    await inquirer.prompt({
      type: "list",
      name: "options",
      message: "What would you like to do?",
      choices: [
        {
          name: "Fetch All the LeetCode Questions",
          value: "fetch-leetcode-question",
        },
        {
          name: "Fetch Favorite Questions",
          value: "fetch-favorite-question",
        },
        {
          name: "Fetch Question from Grind 75",
          value: "fetch-grind-question",
        },
        {
          name: "🔄 Cache Management",
          value: "cache-management",
        },
        {
          name: "Exit",
          value: "exit",
        },
      ],
    });

  promptSessionId = async () =>
    await inquirer.prompt({
      type: "password",
      name: "session",
      message:
        "Please enter your LeetCode Session ID (CTRL + C to exit the application):",
      validate: (input: string) =>
        input.length == 0 || !input
          ? "LeetCode Session ID cannot be blank."
          : true,
    });

  promptDatabaseSelection = async () =>
    await inquirer.prompt({
      type: "list",
      name: "database",
      message: "Where do you want to store the data?",
      choices: [
        {
          name: "PostgreSQL",
          value: "postgresql",
        },
        {
          name: "Notion",
          value: "notion",
        },
        {
          name: "Exit",
          value: "exit",
        },
      ],
    });

  promptDatabaseConnectionString = async () =>
    await inquirer.prompt({
      type: "input",
      name: "connectionString",
      message: "Please enter the database connection string:",
      validate: (input: string) =>
        input.length == 0 || !input
          ? "Database Connection String cannot be blank."
          : true,
    });

  promptNotionToken = async () =>
    await inquirer.prompt({
      type: "password",
      name: "notionToken",
      message: "Please enter the Notion token:",
      validate: (input: string) =>
        input.length == 0 || !input ? "Notion token cannot be blank." : true,
    });

  promptNotionDatabaseExists = async () =>
    await inquirer.prompt({
      type: "confirm",
      name: "notionDbExists",
      message: "Do you have existing database:",
    });

  promptNotionDatabaseCreation = async () =>
    await inquirer.prompt({
      type: "confirm",
      name: "notionCreation",
      message: "Do you want to create a new Notion database:",
    });

  promptNotionPage = async () =>
    await inquirer.prompt({
      type: "input",
      name: "notionPg",
      message: "Please enter the Notion page Id:",
      validate: (input: string) =>
        input.length == 0 || !input ? "Notion page Id cannot be blank." : true,
    });

  promptNotionDatabase = async () =>
    await inquirer.prompt({
      type: "input",
      name: "notionDb",
      message: "Please enter the Notion database Id:",
      validate: (input: string) =>
        input.length == 0 || !input
          ? "Notion database Id cannot be blank."
          : true,
    });

  promptGrindWeeks = async () =>
    await inquirer.prompt({
      type: "input",
      name: "weeks",
      message: "How many weeks you would like to prepare? (1 ~ 26 weeks)",
      validate: (value: string) => {
        const selection = parseInt(value);
        if (isNaN(selection)) {
          return "Please enter a number";
        } else if (selection < 1 || selection > 26) {
          return "Number cannot be less than 1 or greater than 26";
        }
        return true;
      },
    });

  promptGrindHours = async () =>
    await inquirer.prompt({
      type: "input",
      name: "hours",
      message: "How many hours you would need per week? (1 ~ 40 hours)",
      validate: (value: string) => {
        const selection = parseInt(value);
        if (isNaN(selection)) {
          return "Please enter a number";
        } else if (selection < 1 || selection > 40) {
          return "Number cannot be less than 1 or greater than 40";
        }
        return true;
      },
    });

  promptGrindDifficulty = async () =>
    await inquirer.prompt({
      type: "checkbox",
      name: "difficulty",
      message: "Please select the difficulty",
      choices: [
        {
          value: "Easy",
          name: "Easy",
          checked: true,
        },
        {
          value: "Medium",
          name: "Medium",
          checked: true,
        },
        {
          value: "Hard",
          name: "Hard",
          checked: true,
        },
      ],
      validate: (value: any) => {
        if (Array.isArray(value) && value.length === 0) {
          return "Please select at least one difficulty";
        }
        return true;
      },
    });

  promptGrindGrouping = async () =>
    await inquirer.prompt({
      type: "list",
      name: "group",
      message: "Please select the group option",
      choices: [
        {
          name: "Week",
          value: "weeks",
        },
        {
          name: "Topic",
          value: "topics",
        },
      ],
      default: "weeks",
    });

  promptCacheManagement = async () =>
    await inquirer.prompt({
      type: "list",
      name: "action",
      message: "Cache Management Options:",
      choices: [
        {
          name: "📊 View Cache Status",
          value: "status",
        },
        {
          name: "🗑️ Clear All Caches",
          value: "clear-all",
        },
        {
          name: "🗑️ Clear Grind75 Cache",
          value: "clear-grind75",
        },
        {
          name: "🗑️ Clear LeetCode Cache",
          value: "clear-leetcode",
        },
        {
          name: "🧹 Cleanup Expired Entries",
          value: "cleanup",
        },
        {
          name: "← Back to Main Menu",
          value: "back",
        },
      ],
    });
}

export default Inquirer;
