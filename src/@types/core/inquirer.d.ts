declare namespace inquirer {
  function start(): Promise<{ options: string }>;
  function promptSessionId(): Promise<{ session: string }>;
}
