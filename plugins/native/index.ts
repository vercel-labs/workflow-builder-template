
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { httpRequestCodegenTemplate } from "./codegen/http-request";
import { NativeIcon } from "./icon";

const nativePlugin: IntegrationPlugin = {
  type: "native",
  label: "Native",
  description: "Built-in actions that don't require external integrations",
  requiresIntegration: false,
  icon: NativeIcon,
  formFields: [],
  dependencies: {},
  actions: [
    {
      slug: "http-request",
      label: "HTTP Request",
      description: "Make an HTTP request to any API endpoint",
      category: "Native",
      stepFunction: "httpRequestStep",
      stepImportPath: "http-request",
      configFields: [
        {
          key: "integrationId",
          label: "Use Integration (Optional)",
          type: "integration-select",
          placeholder: "None - Manual Authentication",
        },
        {
          key: "httpMethod",
          label: "HTTP Method",
          type: "select",
          options: [
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
            { value: "PATCH", label: "PATCH" },
            { value: "DELETE", label: "DELETE" },
          ],
          defaultValue: "GET",
          required: true,
        },
        {
          key: "endpoint",
          label: "Endpoint",
          type: "template-input",
          placeholder: "https://api.example.com/endpoint or /path (with integration)",
          example: "https://api.example.com/data",
          required: true,
        },
        {
          key: "httpHeaders",
          label: "Request Headers",
          type: "object-builder",
          placeholder: "Header name",
          validateKey: (key, value) => {
            if (!key && value) {
              return "Header name is required";
            }
            if (key && !/^[A-Za-z0-9_-]+$/.test(key)) {
              return "Header name can only contain letters, numbers, hyphens, and underscores";
            }
            if (key && key.toLowerCase() === "content-type") {
              return "Content-Type is automatically set to application/json";
            }
            return undefined;
          },
          validateValue: (value) => {
            if (value.includes("{{")) {
              return undefined;
            }
            if (!/^[A-Za-z0-9 _:;.,\\/"'?!(){}[\]@<>=\-+*#$&`|~^%]*$/.test(value)) {
              return "Header value contains invalid characters";
            }
            return undefined;
          },
        },
        {
          key: "httpBody",
          label: "Request Body",
          type: "json-editor",
          defaultValue: "{}",
        },
      ],
      codegenTemplate: httpRequestCodegenTemplate,
    },
  ],
};

registerIntegration(nativePlugin);

export default nativePlugin;
