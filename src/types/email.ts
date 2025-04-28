// interface EmailHeader {
//   name: string;
//   value: string;
// }

// interface EmailPart {
//   mimeType: string;
//   body: {
//     data: string;
//   };
//   parts?: EmailPart[];
//   headers?: EmailHeader[]
// }

// interface EmailPayload {
//   partId?: string;
//   mimeType: string;
//   filename?: string;
//   headers: {
//     name: string;
//     value: string;
//   }[];
//   body?: {
//     size: number;
//     data?: string;
//   };
//   parts?: EmailPart[];
// };


export interface Email {
  id: string;
  // threadId: string | undefined;
  // labelIds: string[];
  // snippet: string;
  // historyId: string | undefined;
  // internalDate: string | undefined;
  // payload: gapi.client.gmail.MessagePart | undefined;
  // sizeEstimate: number;
  gapiMessage: gapi.client.gmail.Message,
  raw?: string;
  from: string;
  to: string[];
  subject: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  category: string;
  hasAttachments: boolean;
}



export interface EmailListItem {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  category: string;
}