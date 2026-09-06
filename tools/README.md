# Project asset generators

The Python scripts use the dependencies documented inside each script.

`build_catalogue_workbook.mjs` uses OpenAI's private `@oai/artifact-tool`, so it is
not part of the application's npm dependencies. Point `ARTIFACT_TOOL_PATH` at the
runtime's `@oai/artifact-tool/dist/artifact_tool.mjs` file before running it:

```powershell
$env:ARTIFACT_TOOL_PATH = "C:\path\to\node_modules\@oai\artifact-tool\dist\artifact_tool.mjs"
node tools/build_catalogue_workbook.mjs
```

The script also supports a local `tools/node_modules/@oai/artifact-tool` install.
Generated files are written below `outputs/neurocity-validation-kit` and are not
tracked by Git.
