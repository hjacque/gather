export class RepositoryErrorConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "conflict";
  }
}

export class RepositoryErrorResourceNotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = "not_found";
  }
}

export class RepositoryErrorUnexpected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "internal_server_error";
  }
}

export class RepositoryFailToReachDatabase extends Error {
  constructor() {
    super();
    this.name = "failed_to_reach_database";
  }
}
