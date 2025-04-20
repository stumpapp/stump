/**
 * @generated SignedSource<<2889c95d323c3d31955fc186fa1c38f7>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type ContinueReadingMediaFragment$data = {
  readonly media: {
    readonly nodes: ReadonlyArray<{
      readonly id: string;
    }>;
    readonly pageInfo: {
      readonly __typename: "CursorPaginationInfo";
      readonly currentCursor: string | null | undefined;
      readonly nextCursor: string | null | undefined;
    } | {
      // This will never be '%other', but we need some
      // value in case none of the concrete values match.
      readonly __typename: "%other";
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
      "name": "media",
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
              "alias": null,
              "args": null,
              "kind": "ScalarField",
              "name": "__typename",
              "storageKey": null
            },
            {
              "kind": "InlineFragment",
              "selections": [
                {
                  "alias": null,
                  "args": null,
                  "kind": "ScalarField",
                  "name": "currentCursor",
                  "storageKey": null
                },
                {
                  "alias": null,
                  "args": null,
                  "kind": "ScalarField",
                  "name": "nextCursor",
                  "storageKey": null
                }
              ],
              "type": "CursorPaginationInfo",
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

(node as any).hash = "01f466d98875e37f9b625118341b229c";

export default node;
