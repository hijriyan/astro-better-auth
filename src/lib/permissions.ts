import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const statement = {
    ...defaultStatements,
    apiKey: ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const adminRole = ac.newRole({
    organization: ["update"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    team: ["create", "update", "delete"],
    ac: ["create", "read", "update", "delete"],
    apiKey: ["create", "read", "update", "delete"],
});

export const ownerRole = ac.newRole({
    organization: ["update", "delete"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    team: ["create", "update", "delete"],
    ac: ["create", "read", "update", "delete"],
    apiKey: ["create", "read", "update", "delete"],
});

export const memberRole = ac.newRole({
    organization: [],
    member: [],
    invitation: [],
    team: [],
    ac: [],
    apiKey: [],
});
