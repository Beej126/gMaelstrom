- switch to using gmail api to persist label visibility vs local storage
- probably go ahead and create LabelRegistry with dual lookups...
  - we need to go from pretty to google when clicking on sidebar and loading emails
  - we need to go from google to pretty when displaying labels tied to an email
- tear out the visibility of labels for each email, just show them all
- but visibility is what shows labels in the sidebar
- show all visible labels in the sidebar
- map the icons to the main ones
- enhance the label settings dialog to support dragging to order labels displayed in sidebar


import InboxIcon from '@mui/icons-material/Inbox';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import ReportIcon from '@mui/icons-material/Report';
import DescriptionIcon from '@mui/icons-material/Description';

const labelMap: Record<string, { labelId: string; icon: React.ReactNode }> = {
  'Inbox': { labelId: 'INBOX', icon: <InboxIcon /> },
  'Sent': { labelId: 'SENT', icon: <SendIcon /> },
  'Drafts': { labelId: 'DRAFT', icon: <DescriptionIcon /> },
  'Spam': { labelId: 'SPAM', icon: <ReportIcon /> },
  'Trash': { labelId: 'TRASH', icon: <DeleteIcon /> },
};


class LabelDirectory {
  private byId: Record<string, gmail_Label>;
  private byPretty: Record<string, gmail_Label>;

  constructor(labels: gmail_Label[]) {
    this.byId = {};
    this.byPretty = {};
    for (const label of labels) {
      this.byId[label.id] = label;
      this.byPretty[this.genDisplayName(label.name)] = label;
    }
  }

  private genDisplayName = (labelRawName: string): string => {
    let displayName = labelRawName.replace(/^CATEGORY_/, '').replace(/_/g, ' ');
    displayName = displayName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
    return displayName;
  };

  getById(id: string): gmail_Label | undefined {
    return this.byId[id];
  }

  getByPretty(name: string): gmail_Label | undefined {
    return this.byPretty[name];
  }

  getAll(): gmail_Label[] {
    return Object.values(this.byId);
  }
}




can you foresee any architectural downsides to moving gtoken.ts into gauthapi.ts? i'm trying to see how i could more cleanly merge and encapsulate the interdependencies of getting a 401 response from an api and then doing an automatic refreshGmailAccessToken() call


please create a new $/scripts/run-dev.ps1 that will be where we check a bunch of pre-requisites for having a properly configured dev environment... 