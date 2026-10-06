// Custom error classes for BookOrbit API

export class BookOrbitAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BookOrbitAuthError';
	}
}

export class BookOrbitNetworkError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BookOrbitNetworkError';
	}
}

export class BookOrbitNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BookOrbitNotFoundError';
	}
}

export class BookOrbitResponseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BookOrbitResponseError';
	}
}
