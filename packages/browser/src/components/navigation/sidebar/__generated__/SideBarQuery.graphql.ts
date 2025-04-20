/**
 * @generated SignedSource<<a99267fffbb20a4cb3b7d5ab5ae82bfa>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SideBarQuery$variables = Record<PropertyKey, never>;
export type SideBarQuery$data = {
  readonly me: {
    readonly id: string;
    readonly preferences: {
      readonly navigationArrangement: {
        readonly locked: boolean;
        readonly sections: ReadonlyArray<{
          readonly config: {
            readonly __typename: string;
          };
        }>;
      };
    };
  };
};
export type SideBarQuery = {
  response: SideBarQuery$data;
  variables: SideBarQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "User",
    "kind": "LinkedField",
    "name": "me",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "UserPreferences",
        "kind": "LinkedField",
        "name": "preferences",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "Arrangement",
            "kind": "LinkedField",
            "name": "navigationArrangement",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "locked",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "concreteType": "ArrangementSection",
                "kind": "LinkedField",
                "name": "sections",
                "plural": true,
                "selections": [
                  {
                    "alias": null,
                    "args": null,
                    "concreteType": null,
                    "kind": "LinkedField",
                    "name": "config",
                    "plural": false,
                    "selections": [
                      {
                        "alias": null,
                        "args": null,
                        "kind": "ScalarField",
                        "name": "__typename",
                        "storageKey": null
                      }
                    ],
                    "storageKey": null
                  }
                ],
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "SideBarQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "SideBarQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "7c64e5ccb30c840aae03428746cc9741",
    "id": null,
    "metadata": {},
    "name": "SideBarQuery",
    "operationKind": "query",
    "text": "query SideBarQuery {\n  me {\n    id\n    preferences {\n      navigationArrangement {\n        locked\n        sections {\n          config {\n            __typename\n          }\n        }\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "ef9200f0be89a11ca27ebc079c73d090";

export default node;
