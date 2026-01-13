export const SPECIAL_ESCAPES: Record<string, string> = {
	n: "\n",
	t: "\t",
	r: "\r",
};

export const KEYWORDS = new Set([
	"if",
	"else",
	"for",
	"in",
	"of",
	"null",
	"undefined",
	"true",
	"false",
]);

export const OPERATORS: Record<string, string> = {
	"==": "EQUALS",
	"!=": "NOT_EQUALS",
	">=": "GREATER_THAN_EQUAL",
	"<=": "LESS_THAN_EQUAL",
	"&&": "LOGICAL_AND",
	"||": "LOGICAL_OR",
	"??": "NULLISH_COALESCING",
};
