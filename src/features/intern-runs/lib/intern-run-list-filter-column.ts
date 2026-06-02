export type InternRunListFilterColumnId =
  | "state"
  | "provider"
  | "model"
  | "temperature"
  | "selectedIntern"
  | "task"
  | "record"
  | "attempt"
  | "duration"
  | "toolCalls"
  | "tokensIn"
  | "tokensOut"
  | "cost"
  | "started"

export type InternRunListTextFilterColumnId =
  | "state"
  | "provider"
  | "model"
  | "selectedIntern"
  | "task"
  | "record"
  | "started"

export type InternRunListRangeFilterColumnId =
  | "temperature"
  | "attempt"
  | "duration"
  | "toolCalls"
  | "tokensIn"
  | "tokensOut"
  | "cost"

export const internRunListFilterColumnLabels: Record<
  InternRunListFilterColumnId,
  string
> = {
  attempt: "Attempt",
  cost: "Cost",
  duration: "Duration",
  model: "Model",
  provider: "Provider",
  record: "Record",
  selectedIntern: "Selected Intern",
  started: "Started",
  state: "State",
  task: "Task",
  temperature: "Temperature",
  tokensIn: "Tokens In",
  tokensOut: "Tokens Out",
  toolCalls: "Tool Calls",
}

export const internRunListTextFilterColumnIds: Array<InternRunListTextFilterColumnId> =
  ["state", "provider", "model", "selectedIntern", "task", "record", "started"]

export const internRunListRangeFilterColumnIds: Array<InternRunListRangeFilterColumnId> =
  [
    "temperature",
    "attempt",
    "duration",
    "toolCalls",
    "tokensIn",
    "tokensOut",
    "cost",
  ]
