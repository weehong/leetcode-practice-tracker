import chalk from "chalk";
import ora, { Ora } from "ora";
import { DataTypes, Options, Sequelize } from "sequelize";
import { QuestionModel } from "../types/database.js";
import { Question } from "../types/leetcode.js";
import { IDatabaseService } from "../interfaces/services.js";
import { DatabaseError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import ConfigManager from "../config/index.js";

class Database implements IDatabaseService {
  private _sequelize: Sequelize;
  private _config: Options;
  private _dbspinner: Ora;

  constructor() {
    this._dbspinner = ora({
      color: "green",
    });
    this._config = {
      define: {
        underscored: true,
      },
      logging: false,
    };
  }

  setConnectionString = async (connectionString: string): Promise<boolean | Error> => {
    try {
      this._sequelize = new Sequelize(connectionString, this._config);
      await this._sequelize.authenticate();
      ConfigManager.setDatabaseConnectionString(connectionString);
      logger.info('Database connection established successfully');
      return true;
    } catch (error: unknown) {
      logger.error('Failed to connect to database', error);
      return error as Error;
    }
  };

  leetCodeQuestion = async (questions: Question[]): Promise<number | undefined> => {
    logger.info(`Processing ${questions.length} LeetCode questions for database`);
    try {
      const model = this._sequelize.define("leetcode-questions", {
        frontendQuestionId: {
          type: DataTypes.INTEGER,
          field: "id",
          allowNull: false,
          primaryKey: true,
          unique: true,
        },
        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        titleSlug: {
          type: DataTypes.STRING,
          field: "slug",
          allowNull: false,
        },
        difficulty: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        acRate: {
          type: DataTypes.FLOAT,
          field: "submission_rate",
          allowNull: false,
        },
        freqBar: {
          type: DataTypes.FLOAT,
          field: "frequency",
          allowNull: false,
        },
        is_paid_only: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        is_favor: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        topicTagsString: {
          type: DataTypes.TEXT,
          field: "topic_tags",
          allowNull: false,
        },
        featuredList: {
          type: DataTypes.TEXT,
          field: "featured_list",
          allowNull: true,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      });

      return model.sync().then(async () => {
        try {
          this._dbspinner.start();

          const resp = await model.bulkCreate(questions, {
            updateOnDuplicate: [
              "difficulty",
              "acRate",
              "status",
              "freqBar",
              "featuredList",
              "updated_at",
            ],
          });

          this._dbspinner.succeed(
            chalk.green(
              `Successfully inserted or updated ${
                Object.keys(resp).length
              } questions into database`
            )
          );

          await this._sequelize.close();
          return await Object.keys(resp).length;
        } catch (error: unknown) {
          this._dbspinner.fail(
            chalk.red(`Failed to insert questions into database`)
          );
          logger.error('Failed to insert LeetCode questions', error);
          throw new DatabaseError(
            `Failed to insert questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error
          );
        }
      });
    } catch (error: unknown) {
      this._dbspinner.fail(`Failed to connect to database`);
      logger.error('Database operation failed', error);
      throw new DatabaseError(
        `Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  };

}

export default Database;
