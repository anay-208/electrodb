/* istanbul ignore file */
import moment from "moment";
import { v4 as uuid } from "uuid";
import { Entity, EntityItem, QueryResponse, CreateEntityItem } from "../../../";
import { table, client } from "../../common";

export const Employee = new Entity(
  {
    model: {
      entity: "employee",
      version: "1",
      service: "task-manager",
    },
    attributes: {
      employee: {
        type: "string",
        default: () => uuid(),
      },
      firstName: {
        type: "string",
        required: true,
      },
      lastName: {
        type: "string",
        required: true,
      },
      officeName: {
        type: "string",
        required: true,
      },
      title: {
        type: "string",
        required: true,
      },
      team: {
        type: [
          "development",
          "marketing",
          "finance",
          "product",
          "cool cats and kittens",
        ] as const,
        required: true,
      },
      salary: {
        type: "string",
        required: true,
      },
      manager: {
        type: "string",
      },
      dateHired: {
        type: "string",
        validate: (date: string) => {
          if (!moment(date).isValid) {
            throw new Error("Invalid date format");
          }
        },
      },
      birthday: {
        type: "string",
        validate: (date: string) => {
          if (!moment(date).isValid) {
            throw new Error("Invalid date format");
          }
        },
      },
    },
    indexes: {
      employee: {
        pk: {
          field: "pk",
          composite: ["employee"],
        },
        sk: {
          field: "sk",
          composite: [],
        },
      },
      coworkers: {
        index: "gsi1pk-gsi1sk-index",
        collection: "workplaces",
        pk: {
          field: "gsi1pk",
          composite: ["officeName"],
        },
        sk: {
          field: "gsi1sk",
          composite: ["team", "title", "employee"],
        },
      },
      teams: {
        index: "gsi2pk-gsi2sk-index",
        pk: {
          field: "gsi2pk",
          composite: ["team"],
        },
        sk: {
          field: "gsi2sk",
          composite: ["dateHired", "title"],
        },
      },
      employeeLookup: {
        collection: "assignments",
        index: "gsi3pk-gsi3sk-index",
        pk: {
          field: "gsi3pk",
          composite: ["employee"],
        },
        sk: {
          field: "gsi3sk",
          composite: [],
        },
      },
      roles: {
        index: "gsi4pk-gsi4sk-index",
        pk: {
          field: "gsi4pk",
          composite: ["title"],
        },
        sk: {
          field: "gsi4sk",
          composite: ["salary"],
        },
      },
      directReports: {
        index: "gsi5pk-gsi5sk-index",
        pk: {
          field: "gsi5pk",
          composite: ["manager"],
        },
        sk: {
          field: "gsi5sk",
          composite: ["team", "officeName"],
        },
      },
    },
  },
  { table, client },
);

export type EmployeeItem = EntityItem<typeof Employee>;
export type CreateEmployeeItem = CreateEntityItem<typeof Employee>;
export type EmployeeQueryResponse = QueryResponse<typeof Employee>;
