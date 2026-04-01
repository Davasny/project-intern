type ParserAssetBundleFile = {
  content: string
  relativePath: string
}

type ParserAssetBundle = {
  files: ParserAssetBundleFile[]
  version: string
}

export const getParserAssetBundle = (
  parserAssetVersion: string,
): ParserAssetBundle => {
  if (parserAssetVersion !== "crm-parser-assets-v1") {
    throw new Error("Parser asset bundle version is not supported.")
  }

  return {
    files: [
      {
        content: JSON.stringify(
          {
            name: "crm-parser-assets",
            permissions: ["read-source-files", "write-artifacts"],
            stages: [
              "text_extraction",
              "structure_normalization",
              "field_candidates",
              "record_patch_input",
              "post_validation_report",
            ],
            version: "crm-parser-assets-v1",
          },
          null,
          2,
        ),
        relativePath: "bundle-manifest.json",
      },
      {
        content: [
          "def load_bundle_manifest():",
          "    return {",
          "        'version': 'crm-parser-assets-v1',",
          "        'stages': [",
          "            'text_extraction',",
          "            'structure_normalization',",
          "            'field_candidates',",
          "            'record_patch_input',",
          "            'post_validation_report',",
          "        ],",
          "    }",
          "",
        ].join("\n"),
        relativePath: "helpers/load_bundle_manifest.py",
      },
      {
        content: [
          "# CRM parser asset bundle",
          "",
          "This workspace bundle is versioned canonically by parserAssetVersion.",
          "Promote changes through explicit pipeline definition updates.",
          "",
        ].join("\n"),
        relativePath: "README.md",
      },
    ],
    version: parserAssetVersion,
  }
}
