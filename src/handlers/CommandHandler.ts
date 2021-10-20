import {
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandChannelOption,
  SlashCommandIntegerOption,
  SlashCommandMentionableOption,
  SlashCommandNumberOption,
  SlashCommandRoleOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { CommandInteraction, Interaction } from "discord.js";
import path from "path";
import fs from "fs/promises";
import DisBot from "../DisBot";

export enum ArgumentType {
  STRING,
  INTEGER,
  NUMBER,
  BOOLEAN,
  USER,
  CHANNEL,
  ROLE,
  MENTIONABLE,
}

export class SlashArgument {
  type: ArgumentType;
  name: string;
  description: string;
  optional: boolean = false;
  choices: [name: string, value: any][] = [];

  constructor(
    type: ArgumentType,
    name: string,
    description: string,
    optional: boolean = false,
    choices: [name: string, value: any][] = []
  ) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.optional = optional;
    this.choices = choices;
  }
}

function processArgument(arg: SlashArgument, builder: SlashCommandBuilder) {
  switch (arg.type) {
    case ArgumentType.STRING:
      builder.addStringOption(
        new SlashCommandStringOption()
          .setName(arg.name)
          .setDescription(arg.name)
          .setRequired(!arg.optional)
          .addChoices(arg.choices)
      );
      return;
    case ArgumentType.INTEGER:
      builder.addIntegerOption(
        new SlashCommandIntegerOption()
          .setName(arg.name)
          .setDescription(arg.name)
          .setRequired(!arg.optional)
          .addChoices(arg.choices)
      );
      return;
    case ArgumentType.NUMBER:
      builder.addNumberOption(
        new SlashCommandNumberOption()
          .setName(arg.name)
          .setDescription(arg.name)
          .setRequired(!arg.optional)
          .addChoices(arg.choices)
      );
      return;
    case ArgumentType.BOOLEAN:
      builder.addBooleanOption(
        new SlashCommandBooleanOption()
          .setName(arg.name)
          .setDescription(arg.name)
          .setRequired(!arg.optional)
      );
      return;
    case ArgumentType.USER:
      builder.addUserOption(
        new SlashCommandUserOption()
          .setName(arg.name)
          .setDescription(arg.name)
          .setRequired(!arg.optional)
      );
      return;
    case ArgumentType.CHANNEL:
      builder.addChannelOption(
        new SlashCommandChannelOption()
          .setName(arg.name)
          .setDescription(arg.name)
          .setRequired(!arg.optional)
      );
      return;
    case ArgumentType.ROLE:
      builder.addRoleOption(
        new SlashCommandRoleOption()
          .setName(arg.name)
          .setDescription(arg.name)
          .setRequired(!arg.optional)
      );
      return;
    case ArgumentType.MENTIONABLE:
      builder.addMentionableOption(
        new SlashCommandMentionableOption()
          .setName(arg.name)
          .setDescription(arg.name)
          .setRequired(!arg.optional)
      );
      return;
  }
}

export type CommandPermissions = {
  /**
   * Whitelisted roles to use this command.
   */
  roles?: string[];
  /**
   * Needed permissions to use this command.
   */
  permissions?: string[];
  /**
   * True -> The user must have all the permissions and all the roles.
   * False -> The user must have any of the roles or any of the perms.
   */
  strict: boolean;
}

export class BaseCommand {
  name: string;
  description: string;
  permission?: CommandPermissions;
  argument?: SlashArgument | SlashArgument[];
  // TODO: Subcommands

  constructor(name: string, description: string, permission?: CommandPermissions, argument?: SlashArgument | SlashArgument[]) {
    this.name = name;
    this.description = description;
    if (permission !== undefined) this.permission = permission;
    if (argument !== undefined) this.argument = argument;
  }

  // TODO: CommandInteraction should be wrapped in a future.
  async execute(bot: DisBot, interaction: CommandInteraction): Promise<boolean> {
    console.log(`Event not implemented on ${__filename}`);
    return false;
  }
}

export type CommandHandlerOptions = {
  commandsPath: string;
}

export default class CommandHandler {
  bot: DisBot;
  commands: BaseCommand[];

  constructor(bot: DisBot, options: CommandHandlerOptions) {
    this.bot = bot;
    this.commands = [];

    console.log("\nLoading commands...");

    this.reloadCommands(options.commandsPath);
  }

  async reloadCommands(path: string) {
    this.commands = [];

    const files = await fs.readdir(path);

    files.forEach(async (file) => {
      if (file.endsWith(".d.ts") || !(file.endsWith(".ts") || file.endsWith(".js"))) return;

      try {
        const command = new ((await import(`./../commands/${file}`)).default)() as BaseCommand;

        this.commands.push(command);
        console.log(`Loaded command "${command.name}"`);
      } catch (e) {
        /*if (e instanceof SyntaxError) {
          console.log(`File "${file} is not a valid command`);
        } else {
          console.error(e);
        }*/
        console.log("=================================")
        console.log(`\nFile "${file} is not a valid command\n`);
        console.error(e);
        console.log(`\nFile "${file} is not a valid command\n`);
        console.log("=================================")
      }
    });
  }

  async sendCommands(guildId: string) {
    const formatedCommands = this.commands.map((command) => {
      const slashCommand = new SlashCommandBuilder()
        .setName(command.name)
        .setDescription(command.description);
      if (command.argument !== undefined) {
        if (command.argument instanceof SlashArgument) {
          processArgument(command.argument, slashCommand);
        } else {
          command.argument.forEach((arg) => {
            processArgument(arg, slashCommand);
          });
        }
      }
      return slashCommand;
    });

    const rest = new REST({ version: "9" }).setToken(
      process.env.TOKEN === undefined ? "" : process.env.TOKEN
    );

    rest
      .put(
        Routes.applicationGuildCommands(
          process.env.CLIENTID === undefined ? "" : process.env.CLIENTID,
          guildId
        ),
        { body: formatedCommands }
      )
      .then(() => console.log(`Registered commands for guild: ${guildId}`));
  }

  async findCommand(name: string) {
    return this.commands.find((cmd) => {
      return cmd.name === name;
    });
  }
}