package com.petadoption.config;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

@Component
public class MongoIdSequenceService {

    private final MongoTemplate mongoTemplate;

    public MongoIdSequenceService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * Simple atomic "auto increment" for numeric ids using a counters collection.
     */
    public long nextId(String sequenceName) {
        Query query = new Query(Criteria.where("_id").is(sequenceName));
        Update update = new Update().inc("seq", 1);

        FindAndModifyOptions options = new FindAndModifyOptions()
                .returnNew(true)
                .upsert(true);

        Counter counter = mongoTemplate.findAndModify(query, update, options, Counter.class, "counters");
        if (counter == null) {
            return 1L;
        }
        return counter.seq;
    }

    public static class Counter {
        @Id
        private String id;
        private long seq;

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public long getSeq() {
            return seq;
        }

        public void setSeq(long seq) {
            this.seq = seq;
        }
    }
}

