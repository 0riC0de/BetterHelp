import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import type { Ticket } from "@/types/ticket";

export default function TicketDetails({ ticket }: { ticket: Ticket }) {
  const executionLog =
    ticket.executionOutput === null
      ? null
      : JSON.stringify(ticket.executionOutput, null, 2);

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        "&::before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Original message and execution logs
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Original message
            </Typography>
            <Typography dir="auto" sx={{ whiteSpace: "pre-wrap" }}>
              {ticket.rawMessage}
            </Typography>
          </Box>
          <Divider />
          <Box>
            <Typography variant="overline" color="text.secondary">
              Execution
            </Typography>
            <Typography variant="body2">
              {ticket.scriptExecuted
                ? `Script: ${ticket.scriptExecuted}`
                : "No remediation script has been executed."}
            </Typography>
            {executionLog && (
              <Box
                component="pre"
                dir="auto"
                sx={{
                  bgcolor: "#0f172a",
                  color: "#dbeafe",
                  borderRadius: 2,
                  p: 2,
                  mt: 1.5,
                  mb: 0,
                  overflowX: "auto",
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                }}
              >
                {executionLog}
              </Box>
            )}
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
