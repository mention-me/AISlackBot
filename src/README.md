## handleIncomingSlackMessage

graph TD
A[Message Received] -->IsThread

IsThread{Is message a thread?}
IsThread -->|Yes|IsAcquisition
IsThread -->|No|IsQuestion

IsAcquisition{Thread contains acquisition ID?}
IsAcquisition-->|Yes|AcquisitionExists
IsAcquisition-->|No|IgnoreIt

AcquisitionExists{Does acquisition exist?}
AcquisitionExists-->|No|IgnoreIt
AcquisitionExists-->|Yes|CreateNew

CreateNew[Create new question with answer]-->Delete
CreateNew-->Store
IsQuestion{Is Message a question?}
IsQuestion-->|Yes|ClassifyIt
IsQuestion-->|No|IgnoreIt

Store[Store in knowledge DB]-.->Storage[Storage DB]
Store-->Retrain
Classifier-.->Retrain

Delete[Delete Acquisition]-.->AcquisitionDb

IgnoreIt[Ignore it]
ClassifyIt[Classify It] -->HasClassifications
Storage-.->Classifier

Classifier-->ClassifyIt

HasClassifications{Has Classifications?}
HasClassifications-->|No|AskCommunity
HasClassifications-->|Yes|SendReply

Classifier-.->HasClassifications

SendReply[Send answer as reply to original thread]

AskCommunity[Ask Community]-->AddToAcquisitions

AddToAcquisitions[Add Acquisition to DB]-.->AcquisitionDb

AcquisitionDb[Acquisition Database]

AcquisitionDb-.->AcquisitionExists
