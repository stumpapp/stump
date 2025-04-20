/**
 * @generated SignedSource<<3eace8aaa7b76fd9784d293bd3233281>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type ContinueReadingMediaFragment$data = {
  readonly keepReading: {
    readonly nodes: ReadonlyArray<{
      readonly id: string;
    }>;
    readonly pageInfo: {
      readonly totalPages?: number;
    };
  };
  readonly " $fragmentType": "ContinueReadingMediaFragment";
};
export type ContinueReadingMediaFragment$key = {
  readonly " $data"?: ContinueReadingMediaFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"ContinueReadingMediaFragment">;
};

import ContinueReadingMediaRefetchQuery_graphql from './ContinueReadingMediaRefetchQuery.graphql';

const node: ReaderFragment = {
  "argumentDefinitions": [
    {
      "defaultValue": {
        "offset": {
          "page": 1
        }
      },
      "kind": "LocalArgument",
      "name": "pagination"
    }
  ],
  "kind": "Fragment",
  "metadata": {
    "refetch": {
      "connection": null,
      "fragmentPathInResult": [],
      "operation": ContinueReadingMediaRefetchQuery_graphql
    }
  },
  "name": "ContinueReadingMediaFragment",
  "selections": [
    {
      "alias": null,
      "args": [
        {
          "kind": "Variable",
          "name": "pagination",
          "variableName": "pagination"
        }
      ],
      "concreteType": "PaginatedMediaResponse",
      "kind": "LinkedField",
      "name": "keepReading",
      "plural": false,
      "selections": [
        {
          "alias": null,
          "args": null,
          "concreteType": "Media",
          "kind": "LinkedField",
          "name": "nodes",
          "plural": true,
          "selections": [
            {
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "id",
              "storageKey": null
            }
          ],
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "concreteType": null,
          "kind": "LinkedField",
          "name": "pageInfo",
          "plural": false,
          "selections": [
            {
              "kind": "InlineFragment",
              "selections": [
                {
                  "alias": null,
                  "args": null,
                  "kind": "ScalarField",
                  "name": "totalPages",
                  "storageKey": null
                }
              ],
              "type": "OffsetPaginationInfo",
              "abstractKey": null
            }
          ],
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "Query",
  "abstractKey": null
};

(node as any).hash = "5e694e32bb6f4639c91f8880a555d92e";

export default node;
