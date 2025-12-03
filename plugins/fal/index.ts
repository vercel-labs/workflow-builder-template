import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { FalIcon } from "./icon";

const falPlugin: IntegrationPlugin = {
  type: "fal",
  label: "fal.ai",
  description: "Fast AI inference for image, video, and audio generation",

  icon: FalIcon,

  formFields: [
    {
      id: "falApiKey",
      label: "API Key",
      type: "password",
      placeholder: "fal_...",
      configKey: "apiKey",
      envVar: "FAL_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "fal.ai/dashboard/keys",
        url: "https://fal.ai/dashboard/keys",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testFal } = await import("./test");
      return testFal;
    },
  },

  actions: [
    {
      slug: "generate-image",
      label: "Generate Image",
      description: "Generate images using Flux models",
      category: "fal.ai",
      stepFunction: "falGenerateImageStep",
      stepImportPath: "generate-image",
      outputFields: [
        { field: "imageUrl", description: "URL of the generated image" },
        { field: "width", description: "Width of the generated image" },
        { field: "height", description: "Height of the generated image" },
      ],
      outputConfig: { type: "image", field: "imageUrl" },
      configFields: [
        {
          key: "model",
          label: "Model",
          type: "select",
          defaultValue: "fal-ai/flux/schnell",
          options: [
            { value: "fal-ai/flux/schnell", label: "Flux Schnell (Fast)" },
            { value: "fal-ai/flux/dev", label: "Flux Dev (Quality)" },
            { value: "fal-ai/flux-pro/v1.1", label: "Flux Pro 1.1" },
            { value: "fal-ai/flux-pro/v1.1-ultra", label: "Flux Pro 1.1 Ultra" },
            { value: "fal-ai/flux-lora", label: "Flux LoRA" },
            {
              value: "fal-ai/stable-diffusion-v3-medium",
              label: "Stable Diffusion 3 Medium",
            },
            { value: "fal-ai/recraft-v3", label: "Recraft V3" },
          ],
        },
        {
          key: "prompt",
          label: "Prompt",
          type: "template-textarea",
          placeholder:
            "Describe the image you want to generate. Use {{NodeName.field}} to reference previous outputs.",
          rows: 4,
          example: "A serene mountain landscape at sunset with dramatic clouds",
          required: true,
        },
        {
          key: "imageSize",
          label: "Image Size",
          type: "select",
          defaultValue: "landscape_16_9",
          options: [
            { value: "square", label: "Square (1024x1024)" },
            { value: "square_hd", label: "Square HD (1536x1536)" },
            { value: "portrait_4_3", label: "Portrait 4:3" },
            { value: "portrait_16_9", label: "Portrait 16:9" },
            { value: "landscape_4_3", label: "Landscape 4:3" },
            { value: "landscape_16_9", label: "Landscape 16:9" },
          ],
        },
        {
          key: "numImages",
          label: "Number of Images",
          type: "number",
          placeholder: "1",
          min: 1,
          defaultValue: "1",
        },
      ],
    },
    {
      slug: "generate-video",
      label: "Generate Video",
      description: "Generate videos from text or images",
      category: "fal.ai",
      stepFunction: "falGenerateVideoStep",
      stepImportPath: "generate-video",
      outputFields: [
        { field: "videoUrl", description: "URL of the generated video" },
      ],
      outputConfig: { type: "video", field: "videoUrl" },
      configFields: [
        {
          key: "model",
          label: "Model",
          type: "select",
          defaultValue: "fal-ai/minimax-video",
          options: [
            { value: "fal-ai/minimax-video", label: "MiniMax Video" },
            { value: "fal-ai/kling-video/v1/standard/text-to-video", label: "Kling 1.0" },
            { value: "fal-ai/kling-video/v1.5/pro/text-to-video", label: "Kling 1.5 Pro" },
            { value: "fal-ai/hunyuan-video", label: "Hunyuan Video" },
            { value: "fal-ai/luma-dream-machine", label: "Luma Dream Machine" },
            { value: "fal-ai/runway-gen3/turbo/image-to-video", label: "Runway Gen3 (Image to Video)" },
          ],
        },
        {
          key: "prompt",
          label: "Prompt",
          type: "template-textarea",
          placeholder:
            "Describe the video you want to generate. Use {{NodeName.field}} to reference previous outputs.",
          rows: 4,
          example: "A cat walking through a garden",
          required: true,
        },
        {
          key: "imageUrl",
          label: "Image URL (Optional)",
          type: "template-input",
          placeholder: "URL of image to animate (for image-to-video models)",
        },
      ],
    },
    {
      slug: "upscale-image",
      label: "Upscale Image",
      description: "Upscale images to higher resolution",
      category: "fal.ai",
      stepFunction: "falUpscaleImageStep",
      stepImportPath: "upscale-image",
      outputFields: [
        { field: "imageUrl", description: "URL of the upscaled image" },
        { field: "width", description: "Width of the upscaled image" },
        { field: "height", description: "Height of the upscaled image" },
      ],
      outputConfig: { type: "image", field: "imageUrl" },
      configFields: [
        {
          key: "model",
          label: "Model",
          type: "select",
          defaultValue: "fal-ai/creative-upscaler",
          options: [
            { value: "fal-ai/creative-upscaler", label: "Creative Upscaler" },
            { value: "fal-ai/clarity-upscaler", label: "Clarity Upscaler" },
            { value: "fal-ai/real-esrgan", label: "Real-ESRGAN" },
          ],
        },
        {
          key: "imageUrl",
          label: "Image URL",
          type: "template-input",
          placeholder: "URL of image to upscale or {{NodeName.imageUrl}}",
          example: "https://example.com/image.jpg",
          required: true,
        },
        {
          key: "scale",
          label: "Scale Factor",
          type: "select",
          defaultValue: "2",
          options: [
            { value: "2", label: "2x" },
            { value: "4", label: "4x" },
          ],
        },
      ],
    },
    {
      slug: "remove-background",
      label: "Remove Background",
      description: "Remove background from images",
      category: "fal.ai",
      stepFunction: "falRemoveBackgroundStep",
      stepImportPath: "remove-background",
      outputFields: [
        { field: "imageUrl", description: "URL of the image with background removed" },
      ],
      outputConfig: { type: "image", field: "imageUrl" },
      configFields: [
        {
          key: "imageUrl",
          label: "Image URL",
          type: "template-input",
          placeholder: "URL of image or {{NodeName.imageUrl}}",
          example: "https://example.com/image.jpg",
          required: true,
        },
      ],
    },
    {
      slug: "image-to-image",
      label: "Image to Image",
      description: "Transform images with text prompts",
      category: "fal.ai",
      stepFunction: "falImageToImageStep",
      stepImportPath: "image-to-image",
      outputFields: [
        { field: "imageUrl", description: "URL of the transformed image" },
        { field: "width", description: "Width of the generated image" },
        { field: "height", description: "Height of the generated image" },
      ],
      outputConfig: { type: "image", field: "imageUrl" },
      configFields: [
        {
          key: "model",
          label: "Model",
          type: "select",
          defaultValue: "fal-ai/flux/dev/image-to-image",
          options: [
            { value: "fal-ai/flux/dev/image-to-image", label: "Flux Dev Image-to-Image" },
            { value: "fal-ai/flux-pro/v1/redux", label: "Flux Pro Redux" },
          ],
        },
        {
          key: "imageUrl",
          label: "Image URL",
          type: "template-input",
          placeholder: "URL of source image or {{NodeName.imageUrl}}",
          example: "https://example.com/image.jpg",
          required: true,
        },
        {
          key: "prompt",
          label: "Prompt",
          type: "template-textarea",
          placeholder:
            "Describe how to transform the image. Use {{NodeName.field}} to reference previous outputs.",
          rows: 4,
          example: "Transform into a watercolor painting style",
          required: true,
        },
        {
          key: "strength",
          label: "Strength",
          type: "select",
          defaultValue: "0.75",
          options: [
            { value: "0.25", label: "Subtle (0.25)" },
            { value: "0.5", label: "Moderate (0.5)" },
            { value: "0.75", label: "Strong (0.75)" },
            { value: "0.9", label: "Very Strong (0.9)" },
          ],
        },
      ],
    },
  ],
};

// Auto-register on import
registerIntegration(falPlugin);

export default falPlugin;
