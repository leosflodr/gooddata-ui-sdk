// (C) 2021 GoodData Corporation
import { parse } from "dotenv";
import { ActionOptions, TargetBackendType } from "../_base/types";
import { getBackend, getHostname, getWorkspace } from "../_base/cli/extractors";
import { readJsonSync } from "../_base/utils";
import { InputValidationError } from "../_base/cli/validators";
import { readFileSync } from "fs";
import fse from "fs-extra";
import { logInfo } from "../_base/cli/loggers";
import isEmpty from "lodash/isEmpty";

export type AddCmdActionConfig = {
    pluginUrl: string;
    backend: TargetBackendType;
    hostname: string;
    workspace: string;
    username: string | undefined;
    password: string | undefined;
    token: string | undefined;
};

function readDotEnv(): Record<string, string> {
    if (!fse.existsSync(".env")) {
        return {};
    }

    logInfo("Reading .env file to obtain values");

    return parse(readFileSync(".env"), {});
}

/**
 * Load environment variables. This will read .env file in the current directory. If GDC_USERNAME, GDC_PASSWORD
 * and TIGER_API_TOKEN are set as normal env variables, then they will be used.
 */
function loadEnv(backend: TargetBackendType): Record<string, string> {
    const dotEnvContent: Record<string, string> = readDotEnv();
    const { GDC_USERNAME, GDC_PASSWORD, TIGER_API_TOKEN } = process.env;

    if (backend === "bear" && GDC_USERNAME) {
        logInfo(
            "GDC_USERNAME env variable set for current session; going to use this for authentication and expecting GDC_PASSWORD is set for current session as well.",
        );

        dotEnvContent.GDC_USERNAME = GDC_USERNAME;
        dotEnvContent.GDC_PASSWORD = GDC_PASSWORD ?? "";
    }

    if (backend === "tiger" && TIGER_API_TOKEN) {
        dotEnvContent.TIGER_API_TOKEN = TIGER_API_TOKEN;
    }

    return dotEnvContent;
}

function discoverBackendType(): TargetBackendType {
    const packageJson = fse.existsSync("package.json") ? readJsonSync("package.json") : {};
    const { peerDependencies = {} } = packageJson;

    if (peerDependencies["@gooddata/sdk-backend-bear"] !== undefined) {
        logInfo("Plugin project depends on @gooddata/sdk-backend-bear. Assuming backend type 'bear'.");

        return "bear";
    } else if (peerDependencies["@gooddata/sdk-backend-tiger"] !== undefined) {
        logInfo("Plugin project depends on @gooddata/sdk-backend-tiger. Assuming backend type 'tiger'.");

        return "tiger";
    }

    throw new InputValidationError(
        "backend",
        "?",
        "Unable to discover target backend type. Please specify --backend option on the command line.",
    );
}

export function getAddCmdActionConfig(pluginUrl: string, options: ActionOptions): AddCmdActionConfig {
    const backendFromOptions = getBackend(options);
    const backend = backendFromOptions ?? discoverBackendType();

    const env = loadEnv(backend);
    const hostnameFromOptions = getHostname(backendFromOptions, options);
    const workspaceFromOptions = getWorkspace(options);

    const hostname = hostnameFromOptions ?? env.BACKEND_URL;
    const workspace = workspaceFromOptions ?? env.WORKSPACE;
    const username = env.GDC_USERNAME;
    const password = env.GDC_PASSWORD;
    const token = env.TIGER_API_TOKEN;

    if (!hostname) {
        throw new InputValidationError(
            "hostname",
            "",
            "Unable to determine hostname to add plugin to. Please specify --hostname option on the command line.",
        );
    }

    if (!workspace) {
        throw new InputValidationError(
            "workspace",
            "",
            "Unable to determine workspace to add plugin to. Please specify --workspace-id option on the command line.",
        );
    }

    if (backend === "bear") {
        if (isEmpty(username)) {
            throw new InputValidationError(
                "username",
                "",
                "Unable to determine username to use when logging into GoodData platform. Please make sure GDC_USERNAME env variable is set in your session or in the .env file",
            );
        }
        if (isEmpty(password)) {
            throw new InputValidationError(
                "password",
                "",
                "Unable to determine password to use when logging into GoodData platform. Please make sure GDC_PASSWORD env variable is set in your session or in the .env file",
            );
        }
    } else if (isEmpty(token)) {
        throw new InputValidationError(
            "token",
            "",
            "Unable to determine token to use for authentication to GoodData.CN. Please make sure TIGER_API_TOKEN env variable is set in your session or in the .env file",
        );
    }

    return {
        pluginUrl,
        backend,
        hostname,
        workspace,
        username,
        password,
        token,
    };
}